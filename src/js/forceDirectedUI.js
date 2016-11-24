window.addEventListener('load', function() {

    var self = this;

    this._togglesci = function(e) {
      console.log("sci", e)
      App.panels.forceDirected.svg.sci = this.checked;
    };

    this._togglehide = function(e) {
      console.log('hide', e)

      let key = this.id.split('-').indexOf('positive') > -1 ? 'green' : 'red';

      if (this.checked) {

        // make links invisible
        d3.selectAll('.link-1')
          .transition()
          .style('stroke-opacity', function() {
            return this.style.stroke.indexOf(key) > -1 ? 0 :
                this.style['stroke-opacity']
          });

        // remove mouseover functionality
        d3.selectAll('.link-2')
          .attr('pointer-events', function() {
            return this.style.stroke.indexOf(key) > -1 ? 'none' :
                this.getAttribute('pointer-events')
          });
      }
      else {

        // make links visible
        d3.selectAll('.link-1')
          .transition()
          .style('stroke-opacity', function() {
            return this.style.stroke.indexOf(key) > -1 ? 1 :
                this.style['stroke-opacity']
          });

        // return mouseover functionality
        d3.selectAll('.link-2')
          .attr('pointer-events', function() {
            return this.style.stroke.indexOf(key) > -1 ? 'all' :
                this.getAttribute('pointer-events')
          });

      }

    };

    this._unpin = function(e) {
        console.log("unpin", e)
        for (var node in App.panels.forceDirected.filteredData) {
            App.panels.forceDirected.filteredData[node].fx = null;
            App.panels.forceDirected.filteredData[node].fy = null;
        }
        d3.selectAll('.rule')
            .style("fill", "#abd9e9")
            .style("stroke", "#2c7bb6");

    };

    this._refresh = function(e) {
        console.log("ref", e)

    };

    // add listeners
    [].slice.call(document.querySelectorAll('input[type="checkbox"]'))
        .forEach((checkbox) => {
            checkbox.addEventListener('change', 
                self['_toggle'+checkbox.id.split('-')[0]]);
        });

    [].slice.call(document.querySelectorAll('button'))
        .forEach((button) => {
            button.addEventListener('click', self['_'+button.id]);
        });

});