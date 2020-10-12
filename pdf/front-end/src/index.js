import './index.styl'

import { rendPdf } from './render'
import { hideLoading } from './utils/loading'

rendPdf({
  el: '#pdf-wrapper'
}).then((loadingTask) => {
  hideLoading()
  loadingTask.promise.then(function(pdf) {
    pdf.getPage(1).then(function(page) {
      var scale = 1.5;
      var viewport = page.getViewport({ scale: scale, });

      var canvas = document.getElementById('the-canvas');
      console.log(canvas)
      var context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      page.render(renderContext);
    });
  });
})


