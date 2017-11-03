import { getGlobalEventBus } from './dom_events';

let AnnotateRender = {

  initialize () {
    let eventBus = getGlobalEventBus();
    this.eventBus = eventBus;
    eventBus.on('annotate_done', annotateDone)
  },

  annotateDone (e) {
    console.log(e)
    // ctx.beginPath()
    // ctx.fillStyle = 'rgba(0,0,0,0.1)'
    // ctx.fillRect(ox, oy, width, height)
  }

}

function annotateDone (e) {
  AnnotateRender.annotateDone(e)
}

export {
  AnnotateRender
};