import { getGlobalEventBus } from './dom_events';

let AnnotateRender = {
  app: null,
  marks: {},
  task: [],
  loaded: false,

  getCurrentPage () {
    let obj = this.app.pdfViewer
    return obj._pages[obj._currentPageNumber - 1]
  },

  getPageByNum (num) {
    let obj = this.app.pdfViewer
    return obj._pages[num - 1]
  },

  initialize () {
    let eventBus = getGlobalEventBus();
    this.eventBus = eventBus;
    eventBus.on('appviewload', initView)
    eventBus.on('annotate_done', addMarks)
    eventBus.on('pagerendered', pageRednered);
    eventBus.on('annotation-loaded', dataLoaded);
    eventBus.on('jump_link', highlightMark);
  },

  renderMarkPattern (canvas, rect, fill = 'rgba(247,205,70,0.34)') {
    let ctx = canvas.getContext('2d')
    let {ox, oy, width, height} = rect
    ctx.beginPath()
    ctx.fillStyle = fill
    ctx.fillRect(
      ox * window.devicePixelRatio, 
      oy * window.devicePixelRatio, 
      width * window.devicePixelRatio, 
      height * window.devicePixelRatio
    )
    ctx.closePath()
  },

  pageRednered (e) {
    console.log('render ', e.pageNumber)
    if (!this.loaded) {
      this.task.push(e.pageNumber)
    }
    if (this.app) {
      if (this.marks[e.pageNumber]) {    
        this.marks[e.pageNumber].done = false  
        this.markRenderOn(e.pageNumber)    
      }
    }  
  },

  markRenderOn (id) {
    if (this.marks[id] && !this.marks[id].done) {
      console.log('append mark on page ', id)
      let page = this.getPageByNum(id)
      if (!this.marks[id].layer) {
        let layer = document.createElement('div')
        layer.setAttribute('class', 'mark-layer')
        page.div.appendChild(layer)
        this.marks[id].layer = layer
      }
      for (let m of this.marks[id]) {
        let [ox, oy] = page.viewport.convertToViewportPoint(m.location.x, m.location.y)
        let width = m.location.w * page.scale
        let height =  m.location.h * page.scale
        let rect = {ox, oy, width, height}
        this.renderMarkPattern(page.canvas, rect)
        if (m.user) {
          let left = (ox + width / 2) < (page.viewport.width / 2)
          this.renderAvatar(this.marks[id].layer, m.user, left, oy + height / 2, m.id)
        } 
      }
      this.marks[id].done = true
    }
  },

  dataLoaded (list) {
    let task = this.task
    console.log('task', task)
    for (let item of list) {
      let id = item.location.p
      item.done = false
      this.marks[id] = this.marks[id] || []
      this.marks[id].push(item)
    }
    for (let p of task) {
      this.markRenderOn(p)
    }
    this.loaded = true
  },

  renderAvatar (layer, user, left, y, id) {
    let avatar = document.createElement('img')
    avatar.setAttribute('class', 'anno-avatar')
    avatar.src = user.avatar
    let dict = left ? 'left' : 'right'
    avatar.style[dict] = 30 + 'px'
    avatar.style.top = y - 10 + 'px'
    avatar.setAttribute('data-id', id)
    avatar.setAttribute('title', user.name)
    layer.appendChild(avatar)
    avatar.addEventListener('click', (e) => {
      let id = e.currentTarget.dataset.id
      this.eventBus.dispatch('focus_mark', {id})
    }, false)
  },

  highlightMark (location) {
    let page = this.getPageByNum(location.p)
    let [ox, oy] = page.viewport.convertToViewportPoint(location.x, location.y)
    let width = location.w * page.scale
    let height =  location.h * page.scale
    let highlighter = document.createElement('div')
    highlighter.setAttribute('class', 'anno-highlighter')
    highlighter.style.width = width + 'px'
    highlighter.style.height = height + 'px'
    highlighter.style.top = oy + 'px'
    highlighter.style.left = ox + 'px'
    page.div.appendChild(highlighter)
    setTimeout(() => {
      highlighter.remove()
    }, 2500)
  }

}

function addMarks (location) {
  AnnotateRender.dataLoaded([{location}])
}

function pageRednered (e) {
  AnnotateRender.pageRednered(e)
}

function addMarkLayerTo (e) {
  AnnotateRender.addMarkLayerTo(e)
}

function dataLoaded (list) {
  AnnotateRender.dataLoaded(list)
}

function highlightMark(e) {
  AnnotateRender.highlightMark(e)
}

function initView (e) {
  let app = e.source
  AnnotateRender.app = app 
}

export {
  AnnotateRender
};