
function LineGraph(selector, options) {
    this.container = document.querySelector(selector) || document.body;
    this.svg = d3.select( this.container )
                            .append('svg');

    this.svg.append('rect')
        .attr('fill','#eee');


    this.margin = {top: 20, right: 20, bottom: 30, left: 70};
    var graph = this.svg.append('g')
        .attr('class', 'graph')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    graph.append('g')
        .attr('class','axis-x')
    graph.append('g')
        .attr('class','axis-y')

    this.resize();
}

LineGraph.prototype = {
    constructor: LineGraph,
    resize: function() {
        var w = this.container.getBoundingClientRect().width - 45;
        var h = this.container.getBoundingClientRect().height;

        this.width = w - this.margin.right - this.margin.left;
        this.height = h - this.margin.top - this.margin.bottom;

        this.svg
            .style('margin-left', '15px')
            .attr('width', w)
            .attr('height', h)
        .select('rect')
            .attr('width', w)
            .attr('height', h);

        this.svg.select('.axis-x')
            .attr('transform', 'translate(0,' + this.height + ')');
    },
    message: function(d) {

        var infMap = App.dataset.map(dataset => {
            var obj = dataset.data[d.name];
            if (obj && obj.inf) { return obj.inf; }
            return [];
        })
        // var outfMap = App.dataset.map(dataset => {
        //     var obj = dataset.data[d.name];
        //     if (obj && obj.outf) { return obj.outf; }
        //     return [];
        // })

        console.log('message', d, infMap);

        var ymax = d3.max(infMap, dataset => d3.max(dataset, inf => inf.flux)),
            ymin = d3.min(infMap, dataset => d3.max(dataset, inf => inf.flux));

        var y = d3.scaleLinear()
                .domain([ymin, ymax])
                .range([this.height, 0]);

        var x = d3.scaleLinear()
                .domain([0, App.dataset.length - 1])
                .range([0, this.width]);

        var line = d3.line()
            .curve(d3.curveBasis)
            .x((d,i) => x(i))
            .y(d => y(d.flux));

        var g = this.svg.select('.graph');

        this.svg.select('.axis-x')
            .call(d3.axisBottom(x));

        this.svg.select('.axis-y')
            .call(d3.axisLeft(y).ticks(8));

        var fluxs = g.selectAll('.flux')
        // todo... draw the line http://bl.ocks.org/mbostock/3884955
    }
}