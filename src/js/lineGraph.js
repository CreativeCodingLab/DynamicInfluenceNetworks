
function LineGraph(selector, options) {
    this.container = document.querySelector(selector) || document.body;
    this.svg = d3.select( this.container )
                            .append('svg');

    this.svg.append('rect')
        .attr('fill','#eee');


    this.margin = {top: 40, right: 20, bottom: 30, left: 60};

    this.svg.append('text')
        .attr('transform','translate(' + 10 + ',' + (this.margin.top/2+5) + ')')
        .style('font-weight','bold')
        .attr('font-size','12px')
        .attr('class','title');

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

        var aspect = w / h;
        var vw = 323.328125;
        var vh = vw / aspect;

        this.width = vw - this.margin.right - this.margin.left;
        this.height = vh - this.margin.top - this.margin.bottom;

        this.svg
            .style('margin-left', '15px')
            .style("font-size", "9px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)
        .select('rect')
            .attr('width', w)
            .attr('height', h);

        this.svg.select('.axis-x')
            .attr('transform', 'translate(0,' + this.height + ')');
    },
    message: function(d, out) {

        this.svg.select('.title')
          .text(d.name + (out? ' outgoing influences':' incoming influences'))
          .attr('fill', () => {
              var c = d3.hsl(App.panels.forceDirected.clusterColor(d.cluster));

              if (c.l > 0.65) c.l = 0.65;
              return c.toString();
          });


        var infMap = out ?
            App.dataset.map(dataset => {
                var obj = dataset.data[d.name];
                if (obj && obj.inf) { return obj.inf; }
                return [];
            }) :
            App.dataset.map(dataset => {
                var obj = dataset.data[d.name];
                if (obj && obj.outf) { return obj.outf; }
                return [];
            });

        var fluxs = {};
        infMap.forEach((step, i) => {
            step.forEach(inf => {
                fluxs[inf.name] = fluxs[inf.name] || [];

                fluxs[inf.name].push( {
                    name: inf.name,
                    i: i,
                    flux: inf.flux
                } )
            });
        });

        fluxs = Object.keys(fluxs).filter(i => {
            var max = Math.abs(d3.max(fluxs[i], d => d.flux)),
                min = Math.abs(d3.min(fluxs[i], d => d.flux));
            return max || min;
        }).map(i => fluxs[i]);
        // console.log('fluxs', fluxs)

        var ymax = d3.max(fluxs, dataset => d3.max(dataset, inf => inf.flux)),
            ymin = d3.min(fluxs, dataset => d3.min(dataset, inf => inf.flux));

        var y = d3.scaleLinear()
                .domain([ymin, ymax])
                .range([this.height, 0]);

        var x = d3.scaleLinear()
                .domain([0, App.dataset.length - 1])
                .range([0, this.width]);

        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x((d) => x(d.i))
            .y(d => y(d.flux));

        var g = this.svg.select('.graph');

        this.svg.select('.axis-x')
            .call(d3.axisBottom(x));

        this.svg.select('.axis-x path')
            .style('display','none');

        this.svg.select('.axis-y')
            .call(d3.axisLeft(y)
                    .ticks(5)
                    .tickFormat(function(d) {
                        if (Math.abs(d) > 999999) {
                            return d.toPrecision(3);
                        }
                        else {
                            return d3.format(',')(d);
                        }
                    }) );

        // draw lines
        var path = g.selectAll('.flux')
            .data(fluxs);

        path.exit().remove();
        path.enter().append('path')
            .attr('class','flux')
            .attr('fill','none')
            .style('stroke-width', 0.5)
        .merge(path)
            .style('stroke', path => {
                return path[0].name === d.name ? 'red' : '#888';
            })
        .transition()
            .duration(500)
            .attr('d', (d) => line(d) );


        // draw markers
        var i = App.item || 0;
        var marker = g.selectAll('.marker')
            .data(fluxs.map(d => d[i]));

        marker.exit().remove();

        marker.enter().append('circle')
            .attr('class','marker')
            .attr('stroke-width',1)
            .attr('stroke','white')
            .attr('r',0)
            .style('opacity',0)
        .merge(marker)
        .transition()
            .attr('cx', d => x(d.i) )
            .attr('cy', d => y(d.flux) )
            .attr('fill', d => {
                var rule = App.panels.forceDirected.filteredData[ d.name];
                return App.panels.forceDirected.clusterColor(rule.cluster);
            })
            .attr('r',3)
            .style('opacity',1);

    }
}
