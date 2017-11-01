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
  ex: 0,
  ey: 0,

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
      dot1,
      dot2,
      dot3,
      dot4
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

    //四周锚点
    dot1 = document.createElement('div')
    dot1.setAttribute('class', 'dot-ctrl dot-1')
    cropperArea.appendChild(dot1)
    dot2 = document.createElement('div')
    dot2.setAttribute('class', 'dot-ctrl dot-2')
    cropperArea.appendChild(dot2)
    dot3 = document.createElement('div')
    dot3.setAttribute('class', 'dot-ctrl dot-3')
    cropperArea.appendChild(dot3)
    dot4 = document.createElement('div')
    dot4.setAttribute('class', 'dot-ctrl dot-4')
    cropperArea.appendChild(dot4)


    this.currentPage = currentPage
    this.cropperLayer = cropperLayer
    this.cropperArea = cropperArea
    this.cropperModal = cropperModal
    this.cloneBg = cloneBg
    this.cropperMove = cropperMove

    cropperMove.addEventListener('mousedown', cropperMoveMouseDown, false)

    cropperLayer.addEventListener('mousedown', cropperLayerMouseDown, false)

    cropperLayer.addEventListener('mousemove', cropperLayerMouseMove, false)

    cropperLayer.addEventListener('mouseup', cropperLayerMouseUp, false)
  },

  cropperMoveMouseDown (e) {
    e.stopPropagation()
    this.moving = {
      offsetX: e.offsetX,
      offsetY: e.offsetY
    }
  },

  cropperLayerMouseDown (e) {
    if (this.sx && this.sy) {
      if ((this.sx < e.layerX) && (e.layerX < this.ex) && (this.sy < e.layerY) && (e.layerY < this.ey)) {
        return
      }
    }
    this.sx = e.layerX
    this.sy = e.layerY
    this.dragging = true
    this.cropperArea.style.width = '0px'
    this.cropperArea.style.height = '0px'
    this.cropperArea.style.visibility = 'visible'
    this.cropperArea.style.transform = "translateX(" + this.sx + "px) translateY(" + this.sy + "px)"
    this.cloneBg.style.transform = "translateX(-" + this.sx + "px) translateY(-" + this.sy + "px)"
  },

  cropperLayerMouseMove (e) {
    if (this.dragging) {
      let mx = e.layerX
      let my = e.layerY
      let width = mx - this.sx
      let height = my - this.sy
      if (width > 0 && height > 0) {
        this.cropperArea.style.width = width + 'px'
        this.cropperArea.style.height = height + 'px'
      }
    } else if (this.moving) {
      let mx = e.layerX - this.moving.offsetX
      let my = e.layerY - this.moving.offsetY
      let dx = this.currentPage.viewport.width - this.cropperMove.clientWidth
      let dy = this.currentPage.viewport.height - this.cropperMove.clientHeight
      if (mx < 0) {
        mx = 0
      } else if (mx > dx) {
        mx = dx
      }
      if (my < 0) {
        my = 0
      } else if (my > dy) {
        my = dy
      }
      this.cropperArea.style.transform = "translateX(" + mx + "px) translateY(" + my + "px)"
      this.cloneBg.style.transform = "translateX(-" + mx + "px) translateY(-" + my + "px)"     
    }
  },

  cropperLayerMouseUp (e) {
    this.ex = e.layerX
    this.ey = e.layerY
    let ox = this.sx < this.ex ? this.sx : this.ex 
    let oy = this.sy < this.ey ? this.sy : this.ey
    let width = Math.abs(this.ex - this.sx)
    let height = Math.abs(this.ey - this.sy)
    console.log(ox, oy, width, height)
    // ctx.beginPath()
    // ctx.fillStyle = 'rgba(0,0,0,0.1)'
    // ctx.fillRect(ox, oy, width, height)
    this.dragging = false
    this.moving = false
  },

  destroyAnnotatorLayer () {
    this.cropperLayer.removeEventListener('mousedown', cropperLayerMouseDown)
    this.cropperLayer.removeEventListener('mouseup', cropperLayerMouseUp)
    this.cropperLayer.removeEventListener('mousemove', cropperLayerMouseMove)
    this.cropperMove.removeEventListener('mousedown', cropperMoveMouseDown)
    this.cropperLayer.remove()
    this.currentPage = null
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