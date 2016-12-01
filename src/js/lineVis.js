// dunno what this is yet
function nodeVis(selector, options) {
    this.container = document.querySelector(selector) || document.body;
    this.svg = d3.select( this.container )
                            .append('svg');

    this.svg.append('rect')
        .attr('fill','#eee');
    this.resize();
}

nodeVis.prototype = {
    constructor: nodeVis,
    resize: function() {
        this.width = this.container.getBoundingClientRect().width - 45,
        this.height = this.container.getBoundingClientRect().height;

        this.svg
            .style('margin-left', '15px')
            .attr('width', this.width)
            .attr('height', this.height)
        .select('rect')
            .attr('width', this.width)
            .attr('height', this.height);
    },
    message: function(d) {

        var infMap = App.dataset.map(dataset => {
            var obj = dataset.data[d.name];
            if (obj && obj.inf) { return obj.inf; }
            return [];
        })
        var outfMap = App.dataset.map(dataset => {
            var obj = dataset.data[d.name];
            if (obj && obj.outf) { return obj.outf; }
            return [];
        })

        console.log('message received!');
        console.log(d);
        console.log(outfMap)
    }
}