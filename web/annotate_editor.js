import { getGlobalEventBus } from './dom_events';

let AnnotateEditor = {
  app: null,
  annoBtn: null,
  cloneBg: null,
  currentPage: null,
  cropperLayer: null,
  cropperArea: null,
  cropperModal: null,
  cropperMove: null,
  dragging: false,
  moving: false,
  sx: 0,
  sy: 0,
  dotCtrls: [],
  rect: {},

  zoomChange () {
    if (!this.currentPage) {
      return
    }
    // let newScale = this.app.pdfViewer.currentScale;
    this.cloneBg.style.width = this.currentPage.viewport.width + 'px'
    this.cloneBg.style.height = this.currentPage.viewport.height + 'px'
  },

  pageChange (page) {
    if (this.currentPage) {
      this.destroyAnnotatorLayer()
    }
  },

  getCurrentPage () {
    let obj = this.app.pdfViewer
    return obj._pages[obj._currentPageNumber - 1]
  },

  initialize () {
    let eventBus = getGlobalEventBus();
    this.eventBus = eventBus;
    eventBus.on('appviewload', initView)
    eventBus.on('zoomin', zoomChange);
    eventBus.on('zoomout', zoomChange);
    eventBus.on('pagechanging', pageChange);
  },

  unbindEvents () {
    let eventBus = this.eventBus;
    eventBus.off('appviewload', initView)
    eventBus.off('zoomin', zoomChange);
    eventBus.off('zoomout', zoomChange);
    eventBus.off('pagechanging', pageChange);
  },

  activeAnnotatorLayer () {
    let { 
      currentPage, 
      cropperLayer, 
      cropperArea, 
      cropperModal, 
      cloneBg, 
      cropperMove, 
      cloneBgWrap, 
    } = this;
    
    if (this.currentPage) {
      if (this.currentPage.id === this.app.pdfViewer._currentPageNumber) {
        return
      } else {
        // destroy exist instance
        this.destroyAnnotatorLayer()
      }
    }
    currentPage = this.getCurrentPage()

    let container = currentPage.div
    let canvasLy = currentPage.canvas
    let ctx = canvasLy.getContext('2d')
    let containerW = container.clientWidth
    let containerH = container.clientHeight
    cropperLayer = document.createElement('div')
    cropperLayer.setAttribute('class', 'cropper-layer')
    container.appendChild(cropperLayer)

    cropperModal = document.createElement('div')
    cropperModal.setAttribute('class', 'cropper-modal')
    cropperLayer.appendChild(cropperModal)

    cropperArea = document.createElement('div')
    cropperArea.setAttribute('class', 'cropper-area')
    cropperLayer.appendChild(cropperArea)

    cloneBgWrap = document.createElement('div')
    cloneBgWrap.setAttribute('class', 'clone-bg-wrap')
    cropperArea.appendChild(cloneBgWrap)
    cloneBg = document.createElement('img')
    cloneBg.setAttribute('class', 'clone-bg')
    cloneBg.style.width = containerW + 'px'
    cloneBg.style.height = containerH + 'px'
    cloneBg.src = canvasLy.toDataURL('image/webp')
    cloneBgWrap.appendChild(cloneBg)

    // 可拖拽区域
    cropperMove = document.createElement('div')
    cropperMove.setAttribute('class', 'cropper-move')
    cropperArea.appendChild(cropperMove)
    
    this.currentPage = currentPage
    this.cropperLayer = cropperLayer
    this.cropperArea = cropperArea
    this.cropperModal = cropperModal
    this.cloneBg = cloneBg
    this.cropperMove = cropperMove

    this.addDotCtrl()

    cropperMove.addEventListener('mousedown', cropperMoveMouseDown, false)
    cropperLayer.addEventListener('mousedown', cropperLayerMouseDown, false)
    cropperLayer.addEventListener('mousemove', cropperLayerMouseMove, false)
    cropperLayer.addEventListener('mouseup', cropperLayerMouseUp, false)
    // cropperLayer.addEventListener('mouseleave', cropperLayerMouseUp, false)
  },

  cropperMoveMouseDown (e) {
    e.stopPropagation()
    this.moving = {
      offsetX: e.offsetX,
      offsetY: e.offsetY
    }
  },

  cropperLayerMouseDown (e) {
    this.dragging = true
    
    this.sx = e.layerX
    this.sy = e.layerY
    this.cropperArea.style.width = '0px'
    this.cropperArea.style.height = '0px'
    this.cropperArea.style.visibility = 'visible'
    this.cropperArea.style.transform = "translateX(" + this.sx + "px) translateY(" + this.sy + "px)"
    this.cloneBg.style.transform = "translateX(-" + this.sx + "px) translateY(-" + this.sy + "px)"
  
  },

  cropperLayerMouseMove (e) {
    e.preventDefault()
    if (this.dragging) {
      let mx = e.layerX
      let my = e.layerY
      let width = mx - this.sx
      let height = my - this.sy

      if (this.curPos) {
        switch (this.curPos) {
          case 'e':
            height = this.rect.height
            width = mx - this.rect.ox
            my = this.rect.oy
            if (width <= 0) {
              this.sx = mx
            }
            break;
          case 's':
            width = this.rect.width
            height = my - this.rect.oy
            mx = this.rect.ox
            if (height <= 0) {
              this.sy = my
            }
            break;
          case 'w':
            height = this.rect.height
            width = mx - this.rect.width - this.rect.ox
            my = this.rect.oy
            if (width <= 0) {
              this.sx = mx
            }
            break;
          case 'n':
            width = this.rect.width
            height = my - this.rect.height - this.rect.oy
            mx = this.rect.ox
            if (height <= 0) {
              this.sy = my
            }
            break;
          case 'se':
            width = mx - this.rect.ox 
            height = my - this.rect.oy
            if (width <= 0) {
              this.sx = mx
            }
            if (height <= 0) {
              this.sy = my
            }
            break;
          case 'sw':
            width = mx - this.rect.width - this.rect.ox
            height = my - this.rect.oy
            if (height <= 0) {
              this.sy = my
            } else {
              my = this.rect.oy
            }
            if (width <= 0) {
              this.sx = mx
            } else {
              mx = this.rect.ox + this.rect.width
            }
            break;
          case 'nw':
            width = mx - this.rect.width - this.rect.ox
            height = my - this.rect.height - this.rect.oy
            if (height <= 0) {
              this.sy = my
            } else {
              my = this.rect.oy + this.rect.height
            }
            if (width <= 0) {
              this.sx = mx
            } else {
              mx = this.rect.ox + this.rect.width
            }
            break;
          case 'ne':
            width = mx - this.rect.ox
            height = my - this.rect.height - this.rect.oy
            if (height <= 0) {
              this.sy = my
            } else {
              my = this.rect.oy + this.rect.height
            }
            if (width <= 0) {
              this.sx = mx
            } else {
              mx = this.rect.ox
            }
            break;
        }
      }
      
      this.cropperArea.style.width = Math.abs(width) + 'px'
      this.cropperArea.style.height = Math.abs(height) + 'px'
      if (width < 0 || height < 0) {
        this.cropperArea.style.transform = "translateX(" + mx + "px) translateY(" + my + "px)"
        this.cloneBg.style.transform = "translateX(-" + mx + "px) translateY(-" + my + "px)" 
      }
    } else if (this.moving) {
      let mx = e.layerX - this.moving.offsetX
      let my = e.layerY - this.moving.offsetY
      let dx = this.currentPage.viewport.width - this.cropperArea.clientWidth
      let dy = this.currentPage.viewport.height - this.cropperArea.clientHeight
      mx = Math.max(mx, 0)
      mx = Math.min(mx, dx)
      my = Math.max(my, 0)
      my = Math.min(my, dy)
      this.cropperArea.style.transform = "translateX(" + mx + "px) translateY(" + my + "px)"
      this.cloneBg.style.transform = "translateX(-" + mx + "px) translateY(-" + my + "px)"
      this.sx = mx 
      this.sy = my   
    }
  },

  cropperLayerMouseUp (e) {
    if (this.dragging || this.moving) {
      let width = this.cropperArea.clientWidth
      let height = this.cropperArea.clientHeight
      let ox = this.sx
      let oy = this.sy
      this.rect = {ox, oy, width, height}
      console.log(this.rect)
      // ctx.beginPath()
      // ctx.fillStyle = 'rgba(0,0,0,0.1)'
      // ctx.fillRect(ox, oy, width, height)
      this.dragging = false
      this.moving = false
      this.curPos = false
    }
  },

  destroyAnnotatorLayer () {
    this.cropperLayer.removeEventListener('mousedown', cropperLayerMouseDown)
    this.cropperLayer.removeEventListener('mouseup', cropperLayerMouseUp)
    this.cropperLayer.removeEventListener('mousemove', cropperLayerMouseMove)
    this.cropperMove.removeEventListener('mousedown', cropperMoveMouseDown)
    for (let dot of this.dotCtrls) {
      dot.removeEventListener('mousemove', dotCtrlMouseMove)
      dot.removeEventListener('mousedown', dotCtrlMouseDown)
    }
    this.cropperLayer.remove()
    this.currentPage = null
  },

  addDotCtrl () {
    //四周8个锚点
    for (let id of ['nw','n','ne','e','se','s','sw','w']) {
      let dot = document.createElement('div')
      dot.setAttribute('data-ac', id)
      dot.setAttribute('class', 'dot-ctrl dot-' + id)
      dot.addEventListener('mousemove', dotCtrlMouseMove, false)
      dot.addEventListener('mousedown', dotCtrlMouseDown, false)
      this.cropperArea.appendChild(dot)
      this.dotCtrls.push(dot)
    }

  },

  dotCtrlMouseMove (e) {
    e.stopPropagation()
  },

  dotCtrlMouseDown (e) {
    this.curPos = e.currentTarget.dataset.ac
    this.dragging = true
    e.stopPropagation() 
  }
}

function zoomChange () {
  AnnotateEditor.zoomChange()
}

function pageChange (page) {
  AnnotateEditor.pageChange(page)
}

function cropperMoveMouseDown (e) {
  AnnotateEditor.cropperMoveMouseDown(e)
}

function cropperLayerMouseDown (e) {
  AnnotateEditor.cropperLayerMouseDown(e)
}

function cropperLayerMouseMove (e) {
  AnnotateEditor.cropperLayerMouseMove(e)
}

function cropperLayerMouseUp (e) {
  AnnotateEditor.cropperLayerMouseUp(e)
}

function dotCtrlMouseMove (e) {
  AnnotateEditor.dotCtrlMouseMove(e)
}

function dotCtrlMouseDown (e) {
  AnnotateEditor.dotCtrlMouseDown(e)
}

function initView (e) {
  let annoBtn
  let app = e.source
  let container = app.pdfViewer.container
  annoBtn = document.createElement('div')
  annoBtn.setAttribute('class', 'annotator-btn')
  annoBtn.innerText = '添加我的标注'
  container.appendChild(annoBtn)
  annoBtn.addEventListener('click', (e) => {
    AnnotateEditor.activeAnnotatorLayer()
    // annoBtn.style.display = 'none'
  }, false)
  AnnotateEditor.app = app 
  AnnotateEditor.annoBtn = annoBtn
}

export {
  AnnotateEditor
};