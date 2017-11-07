import { getGlobalEventBus } from './dom_events';

let AnnotateEditor = {
  app: null,
  annoBtn: null,
  annoTip: null,
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
  btnCtrls: [],
  rect: {},

  scaleChange () {
    if (!this.currentPage) {
      return
    }
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
    eventBus.on('appviewload', initView);
    eventBus.on('scalechanging', scaleChange);
    eventBus.on('pagechanging', pageChange);
    eventBus.on('annotate_complete', pageChange);
    eventBus.on('annotate_cancel', pageChange);
  },

  unbindEvents () {
    let eventBus = this.eventBus;
    eventBus.off('appviewload', initView)
    eventBus.off('scalechanging', scaleChange);
    eventBus.off('pagechanging', pageChange);
    eventBus.off('annotate_complete', pageChange);
    eventBus.off('annotate_cancel', pageChange);
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
    this.addBtnCtrl()
    this.applyViewStatus(1)

    cropperMove.addEventListener('mousedown', cropperMoveMouseDown, false)
    cropperLayer.addEventListener('mousedown', cropperLayerMouseDown, false)
    cropperLayer.addEventListener('mousemove', cropperLayerMouseMove, false)
    cropperLayer.addEventListener('mouseup', cropperLayerMouseUp, false)
    cropperLayer.addEventListener('mouseleave', cropperLayerMouseUp, false)
  },

  cropperMoveMouseDown (e) {
    if (this.lockArea) {
      return
    }
    e.stopPropagation()
    this.moving = {
      offsetX: e.offsetX,
      offsetY: e.offsetY
    }
  },

  cropperLayerMouseDown (e) {
    if (this.lockArea) {
      if (e.target.className === 'cropper-modal') {
        this.eventBus.dispatch('annotate_cancel')
      }
      return
    }
    if (e.target.className !== 'cropper-modal') {
      e.preventDefault()
      return
    }
    this.dragging = true
    this.hideBtnCtrls()
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
      this.dragging = false
      this.moving = false
      this.curPos = false
      this.showBtnCtrls()
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
    for (let btn of this.btnCtrls) {
      btn.removeEventListener('click', btnCtrlClick)
    }
    this.cropperLayer.remove()
    this.applyViewStatus(3)
    this.lockArea = false
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

  addBtnCtrl () {
    for (let id of ['confirm', 'cancel']) {
      let btn = document.createElement('div')
      btn.setAttribute('class', id + '-btn btn-ctrl')
      btn.setAttribute('data-ac', id)
      btn.style.display = 'none'
      btn.addEventListener('click', btnCtrlClick, false)
      this.cropperArea.appendChild(btn)
      this.btnCtrls.push(btn)
    }
  },

  btnCtrlClick (e) {
    e.preventDefault()
    e.stopPropagation()
    let ac = e.currentTarget.dataset.ac
    switch (ac) {
      case 'confirm':
        this.hideDotCtrls()
        this.hideBtnCtrls()
        this.lockArea = true
        let dest = {rect: this.rect, id: this.currentPage.id};
        let p = this.app.pdfViewer.currentPageNumber;
        let viewport = this.app.pdfViewer.getPageView(p-1).viewport;
        let [x, y] = viewport.convertToPdfPoint(dest.rect.ox, dest.rect.oy);
        let scale = this.getCurrentPage().scale
        let w = dest.rect.width/scale;
        let h = dest.rect.height/scale;

        let location = {p, x, y, w, h};
        location.sy = e.pageY - this.cropperMove.clientHeight / 2
        this.applyViewStatus(2)
        this.eventBus.dispatch('annotate_done', location)
        break;
      case 'cancel':
        this.destroyAnnotatorLayer()
        break;
    }
    
  },

  hideBtnCtrls () {
    for (let btn of this.btnCtrls) {
      btn.style.display = 'none'
    }
  },

  hideDotCtrls () {
    for (let btn of this.dotCtrls) {
      btn.style.display = 'none'
    }
  },

  showBtnCtrls () {
    for (let btn of this.btnCtrls) {
      btn.style.display = 'block'
    }
  },

  dotCtrlMouseMove (e) {
    e.stopPropagation()
  },

  dotCtrlMouseDown (e) {
    this.curPos = e.currentTarget.dataset.ac
    this.dragging = true
    e.stopPropagation()
  },

  applyViewStatus (status) {
    switch (status) {
      // 标注开始
      case 1:
        this.annoBtn.style.display = 'none'
        this.annoTip.style.display = 'block'
        this.cropperMove.style.cursor = 'move'
        this.cropperLayer.style.cursor = 'crosshair'//'url("http://www.zhaosoft.com/tool/cur/cur.cur"), auto'//
        break;
      // 标注确认选区
      case 2:
        this.app.pdfViewer.container.style.overflow = 'hidden'
        this.cropperMove.style.cursor = 'default'
        this.cropperLayer.style.cursor = 'default'
        this.annoTip.style.display = 'none'
        break;
      // 标注完成/撤销
      case 3:
        this.annoBtn.style.display = 'block'
        this.annoTip.style.display = 'none'
        this.app.pdfViewer.container.style.overflow = 'auto' 
        break;
    }
  },

  initView (e) {
    if (this.app) {
      return
    }
    let app = e.source
    let container = app.pdfViewer.container
    let annoBtn = document.createElement('div')
    annoBtn.setAttribute('class', 'annotator-btn')
    annoBtn.innerText = '添加我的标注'
    container.appendChild(annoBtn)
    let annoTip = document.createElement('div')
    annoTip.setAttribute('class', 'annotator-tip')
    annoTip.innerText = '拖动鼠标框选段落'
    container.appendChild(annoTip)
    annoBtn.addEventListener('click', (e) => {
      this.activeAnnotatorLayer()
    }, false)
    this.app = app
    this.annoBtn = annoBtn
    this.annoTip = annoTip
  }

}

function scaleChange () {
  AnnotateEditor.scaleChange()
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

function btnCtrlClick (e) {
  AnnotateEditor.btnCtrlClick(e)
}

function initView (e) {
  AnnotateEditor.initView(e)
}

export {
  AnnotateEditor
};