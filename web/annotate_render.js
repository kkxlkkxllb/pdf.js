import { getGlobalEventBus } from './dom_events';

let AnnotateRender = {
  app: null,
  layers: {},

  getCurrentPage () {
    let obj = this.app.pdfViewer
    return obj._pages[obj._currentPageNumber - 1]
  },

  initialize () {
    let eventBus = getGlobalEventBus();
    this.eventBus = eventBus;
    eventBus.on('appviewload', initView)
    eventBus.on('annotate_done', annotateDone)
    eventBus.on('pagerendered', addMarkLayerTo);
    eventBus.on('scalechanging', scaleChange);
  },

  annotateDone (e) {
    if (this.layers[e.id]) {
      this.renderMarkPattern(this.layers[e.id].canvas, e.rect)
    }
  },

  renderMarkPattern (canvas, rect, fill = 'rgba(247,205,70,0.5)') {
    let ctx = canvas.getContext('2d')
    let {ox, oy, width, height} = rect
    ctx.beginPath()
    ctx.fillStyle = fill
    ctx.fillRect(ox, oy, width, height)
    ctx.closePath()
  },

  addMarkLayerTo (e) {
    let contianer = e.source.div
    let id = e.source.id
    if (this.layers[id]) {
      return
    }
    console.log('render ',id)
    let markLayer = document.createElement('div')
    markLayer.setAttribute('class', 'mark-layer')
    contianer.appendChild(markLayer)
    this.layers[id] = {
      div: markLayer
    }
    let canvas = document.createElement('canvas')
    let ctx = canvas.getContext('2d') 
    canvas.width = contianer.clientWidth * window.devicePixelRatio
    canvas.height = contianer.clientHeight * window.devicePixelRatio
    canvas.style.width = contianer.clientWidth + 'px'
    canvas.style.height = contianer.clientHeight + 'px'
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    markLayer.appendChild(canvas)
    this.layers[id].canvas = canvas
  },

  scaleChange () {
    let newScale = this.app.pdfViewer.currentScale;
    console.log(newScale)
  }

}

function annotateDone (e) {
  AnnotateRender.annotateDone(e)
}

function scaleChange () {
  AnnotateRender.scaleChange()
}

function addMarkLayerTo (e) {
  AnnotateRender.addMarkLayerTo(e)
}

function initView (e) {
  let app = e.source
  AnnotateRender.app = app 
}

export {
  AnnotateRender
};