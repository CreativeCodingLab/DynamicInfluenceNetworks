
function LineGraph(selector, options) {
    this.outgoing = (options && options.out === true);
    this.container = document.querySelector(selector) || document.body;
    this.svg = d3.select( this.container )
        .append('svg')
        .on('mouseover', this.mouseover.bind(this))
        .on('mousemove', this.mousemove.bind(this))
        .on('mouseout', this.mouseout.bind(this));

    this.svg.append('rect')
        .attr('fill','transparent');

    this.margin = {top: 40, right: 20, bottom: 30, left: 50};

    this.svg.append('text')
        .attr('transform','translate(10, 15)')
        .attr('class','title');

    // log / linear toggle
    this.scale = 'linear';
    var toggle = this.svg.append('g')
        .attr('class','toggle-axis-scale')
        .style('display','none')
        .attr('transform','translate(10, 30)');

    toggle.append('text')
        .text('log')
        .attr('class','log')
        .on('click', this.setLog.bind(this));

    toggle.append('text')
        .text('|')
        .attr('transform','translate( 18, 0 )');

    toggle.append('text')
        .text('linear')
        .attr('class','linear active')
        .attr('transform','translate( 25, 0 )')
        .on('click', this.setLinear.bind(this));

    this.textbox = this.svg.append('g')
        .attr('class','textbox')
        .style('pointer-events','none');
    this.textbox.append('rect')
        .attr('fill','white')
        .attr('stroke-width','0.5px')
        .attr('stroke','gray');
    this.textbox.append('text')
        .attr('text-anchor','middle')
        .attr('fill','black');

    this.axisHelper = this.svg.append('g')
        .style('display','none')
        .style('pointer-events','none');
    this.axisHelper.append('line')
        .attr('y1',this.margin.top)
        .attr('stroke','black')
        .style("stroke-dasharray", "2, 2");
    this.axisHelper.append('text')
        .attr('fill','black');

    var graph = this.graph = this.svg.append('g')
        .attr('class', 'graph')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    graph.append('g')
        .attr('class','axis-x')
    graph.append('g')
        .attr('class','axis-y')
    graph.append('g')
        .attr('class','axis-y-signed')

    this.resize();
}

LineGraph.prototype = {
    constructor: LineGraph,
    resize: function() {
        var w = this.container.getBoundingClientRect().width;
        var h = this.container.getBoundingClientRect().height;

        var aspect = w / h;
        var vw = 280;
        var vh = vw / aspect;

        this.width = vw - this.margin.right - this.margin.left;
        this.height = vh - this.margin.top - this.margin.bottom;

        this.svg
            .style("font-size", "12px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)
        .select('rect')
            .attr('width', w)
            .attr('height', h);

        this.axisHelper.select('line')
            .attr('y2',this.margin.top + this.height);

        if (this.x && this.fluxs) {
            this.x.range([0, this.width]);

            if (this.y) {
                this.y.range([this.height, 0]);
            }
            if (this.ypos) {
                this.ypos.range([this.height/2, 0]);
            }
            if (this.yneg) {
                this.yneg.range([this.height/2,this.height]);
            }

            this.drawAxes();
            this.drawPaths();
            this.drawMarkers();
        }
    },
    updateRule: function(d) {

        this.rule = d;
        this.svg.select('.title')
          .text(d.name + (this.outgoing ? ' outgoing influences':' incoming influences'));

        this.svg.select('.toggle-axis-scale')
            .style('display','block');

        var infMap = this.infMap = this.outgoing ?
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
        this.updateFluxs();
        this.updateGraph();
    },
    updateFluxs: function() {
        var infMap = this.infMap;
        var fluxs = {}; 

        if(!this.x) {
            this.x = d3.scaleLinear()
                .domain([0, App.dataset.length - 1])
                .range([0, this.width]);
        }

        infMap.forEach((step, i) => {
            step.forEach(inf => {
                fluxs[inf.name] = fluxs[inf.name] || [];
                if (i >= this.x.domain()[0] && i <= this.x.domain()[1]) {
                    fluxs[inf.name].push( {
                    name: inf.name,
                    i: i,
                    flux: inf.flux
                   });
                }
            });
        });

        this.fluxs = fluxs = Object.keys(fluxs).filter(i => {
            var max = Math.abs(d3.max(fluxs[i], d => d.flux)),
                min = Math.abs(d3.min(fluxs[i], d => d.flux));
            return max || min;
        }).map(i => fluxs[i]);
    },
    updateGraph: function() {
        var fluxs = this.fluxs;
        var ymax, ymin;

        if (this.scale === 'log') {
            // log scale
            var pflux = fluxs.map(d => d.filter(inf => inf.flux > 0))
                            .filter(d => d.length > 0);
            var nflux = fluxs.map(d => d.filter(inf => inf.flux < 0))
                            .filter(d => d.length > 0);

            var signed = (pflux.length && nflux.length) ? 0 : (pflux.length ? 1 : -1);

            ymax = d3.max(fluxs, dataset => d3.max(dataset, inf => Math.abs(inf.flux)));
            ymin = d3.max(fluxs, dataset => d3.max(dataset, inf => Math.abs(inf.flux)))/1000;

            if (signed === 0) {
                this.y = null;
                this.ypos = d3.scaleLog()
                    .domain([ymin, ymax])
                    .range([this.height/2, 0])
                    .clamp(true);
                this.yneg = d3.scaleLog()
                    .domain([-ymin, -ymax])
                    .range([this.height/2, this.height])
                    .clamp(true);
            }
            else if (signed < 0) {
                this.y = d3.scaleLog()
                    .domain([-ymax, -ymin])
                    .range([this.height, 0])
                    .clamp(true);
            }
            else if (signed > 0) {
                this.y = d3.scaleLog()
                    .domain([ymin, ymax])
                    .range([this.height, 0])
                    .clamp(true);
            }
        }
        else {
            // linear scale
            ymax = d3.max(fluxs, dataset => d3.max(dataset, inf => inf.flux));
            ymin = d3.min(fluxs, dataset => d3.min(dataset, inf => inf.flux));
            this.y = d3.scaleLinear()
                    .domain([ymin, ymax])
                    .range([this.height, 0]);
        }
        

        this.drawAxes();
        this.drawPaths();
        this.drawMarkers();
    },
    drawAxes: function() {
        if (!this.x) { return; }
        this.svg.select('.axis-x')
            .attr('transform', 'translate(0,' + this.height + ')')
            .call(d3.axisBottom(this.x)
                    .tickFormat(d => {
                        d = Math.floor(d);
                        var data = App.dataset[d];
                        if (data && data.timeWindow && data.timeWindow[0]) {
                            return Number(data.timeWindow[0].toFixed(1));
                        }
                        return d;
                    })
                )
            .select('path')
                .style('display','none');

        if (this.y) {
            var yAxis = d3.axisLeft(this.y).ticks(6);
            if (this.scale == 'linear') {
                yAxis.tickFormat(function(d) {
                    var dabs = Math.abs(d);
                    if (dabs > 999999) {
                        return d.toPrecision(3);
                    }
                    else if (dabs < 0.001) {
                        return Number(d.toPrecision(3)).toExponential();
                    }
                    else {
                        return d3.format(',')(d);
                    }
                })
            }
            this.svg.select('.axis-y-signed').selectAll('*').remove();
            this.svg.select('.axis-y')
                .call(yAxis)
                .select('path')
                    .style('display', 'none');            
        }
        else {
            var self = this;
            function formatTick(d, i, el) {
                if (i == 0) {
                    try {
                        var val = Number(el[0].parentNode.attributes.transform.value.match(/[^,]+(?=\))/)[0]);
                        if (Math.abs(self.height/2 - val) <= 3) {
                            return '';
                        }
                    }
                    catch (err) {}                    
                }

                // return default formatting
                var k = Math.max(1, 30/el.length);
                var dabs = Math.abs(d);
                var i = dabs / +('1e'+Math.round(Math.log10(dabs)));
                if (i * 10 < 10 - 0.5) i *= 10;
                return i <= k ? Number(d.toPrecision(2)).toExponential() : '';
            }
            this.svg.select('.axis-y')
                .call(d3.axisLeft(this.ypos)
                        .ticks(3)
                        .tickFormat(formatTick))
                .select('path')
                    .style('display', 'none');
            this.svg.select('.axis-y-signed')
                .call(d3.axisLeft(this.yneg)
                        .ticks(3)
                        .tickFormat(formatTick))
                .select('path')
                    .style('display', 'none');
        }
    },
    // draw lines
    drawPaths: function() {
        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x(d => this.x(d.i))
            .y(d => {
                if (this.y) {
                    return this.y(d.flux)
                }
                return d.flux < 0 ? this.yneg(d.flux) : this.ypos(d.flux);
            });


        var path = this.graph.selectAll('.flux-1')
            .data(this.fluxs);

        path.exit().remove();
        path.enter().append('path')
            .attr('class','flux-1')
            .attr('fill','none')
            .style('stroke-width', 0.5)
        .merge(path)
            .style('stroke', path => {
                return path[0].name === this.rule.name ? 'red' : '#888';
            })
        .transition()
            .duration(500)
            .attr('d', (d) => line(d));

        // var links = d3.selectAll('.link-2')

        // var hoverPath = this.graph.selectAll('.flux-2')
        //     .data(this.fluxs);

        // hoverPath.exit().remove();
        // hoverPath.enter().append('path')
        //     .attr('class','flux-2')
        //     .attr('fill', 'none')
        //     .style('stroke-width', 8)
        //     .style('stroke-opacity', 0)
        // .merge(hoverPath)
        //     .style('stroke', hoverPath => {
        //         return hoverPath[0].name === this.rule.name ? 'red' : '#888';
        //     })
        //     .attr('name', hoverPath => {
        //         return hoverPath[0].name; 
        //     })
        //     .on('mouseover', (d,i) => {
        //       // fade non-hovered influences (ignore for self-influence)
        //       if (d[0].name !== this.rule.name) {
        //           d3.selectAll('.link-1')
        //             .transition()
        //             .duration(400)
        //             .style('stroke-opacity',function() {
        //                 var opacity = d3.select(this).style('stroke-opacity');
        //                 return Math.min(0.4, opacity);
        //           });                
        //       }
        //       links.style('stroke-opacity', j => {
        //         if (!j || !j.target) { console.log('WARNING: merge hover',j); return 0; }
        //         if (this.outgoing) {
        //             return (d[0].name === j.target.name &&
        //                     this.rule.name === j.source.name) ? 0.6 : 0;
        //         }
        //         else {
        //             return (d[0].name === j.source.name &&
        //                     this.rule.name === j.target.name) ? 0.6 : 0;
        //         }
        //       });
        //       d3.select(d3.event.target).raise()
        //         .style('stroke-opacity',0.6);
        //       this.axisHelper.raise()
        //         .style('display','block');
        //       this.textbox.raise()
        //         .style('display','block');
        //     })
        //     .on('mousemove', (d) => {
        //         // rescale svg point
        //         var svg = this.svg.node();
        //         var pt = svg.createSVGPoint();
        //         pt.x = d3.event.clientX;
        //         pt.y = d3.event.clientY;
        //         pt = pt.matrixTransform( svg.getScreenCTM().inverse() );

        //         var offset = pt.x - this.margin.left;
        //         var i = Math.round(this.x.invert(offset))-this.x.domain()[0];
        //         if (!d[i]) { return; }
        //         var bbox = this.textbox.select('text')
        //             .text(d[0].name + ': ' + (App.property.sci ?
        //                             Number(d[i].flux.toPrecision(3)).toExponential() :
        //                             Number(d[i].flux.toFixed(3))) )
        //             .node().getBBox();

        //         var diff = Math.min(this.width + this.margin.right - offset - bbox.width/2 - 7, 0);


        //         this.axisHelper
        //             .attr('transform','translate('+pt.x+',0)')
        //         .select('text')
        //             .text('t=' + Number(App.dataset[i+this.x.domain()[0]].timeWindow[0].toFixed(3)))
        //             .attr('transform',() => {
        //                 var y = this.margin.top;
        //                 if (pt.y < y + 30) { y += 30; }
        //                 var x = (diff < 0) ? -5 : 5;
        //                 return 'translate(' + x + ',' + y + ')';
        //             })
        //             .attr('text-anchor',(diff < 0) ? 'end' : 'start');

        //         this.textbox
        //             .attr('transform','translate(' + (pt.x + diff) + ',' + (pt.y - 15) + ')')
        //         .select('rect')
        //             .attr('width',bbox.width+12)
        //             .attr('height',bbox.height+4)
        //             .attr('x',bbox.x-6)
        //             .attr('y',bbox.y-2);
        //     })
        //     .on('mouseout', (d,i) => {
        //       this.textbox
        //         .style('display','none');
        //       this.axisHelper
        //         .style('display','none');
        //       App.panels.forceDirected.updateEdgeVisibility();
        //       links.style('stroke-opacity',0.0);
        //       d3.select(d3.event.target)
        //         .style('stroke-opacity', 0.0)
        //     })
        //     .attr('d', (d) => line(d));


    },

    // draw markers
    drawMarkers: function() {
        if (!this.x) { return; }
        var item = App.item || 0;
        var domain = this.x.domain();

        this.svg.select('.axis-current').remove();
        if (item >= domain[0] && item <= domain[1]) {

            var scale = d3.scaleLinear()
                .domain(domain)
                .range([0, this.width])
                .clamp(true);

            this.svg.append('line')
                .attr('class', 'axis-current')
                .attr('stroke','grey')
                .attr('pointer-events','none')
                .style("stroke-dasharray", "2, 2")
                .attr('y1',this.margin.top)
                .attr('y2',this.margin.top + this.height)
                .attr('x1',this.margin.left)
                .attr('x2',this.margin.left)
                .attr('transform', 'translate(' + scale(item) + ',0)');
        }
    },

    setLog: function() {
        if (this.scale === 'log') { return; }
        this.scale = 'log';
        this.svg.select('.log')
            .classed('active',true);
        this.svg.select('.linear')
            .classed('active',false);
        this.updateGraph();
    },
    setLinear: function() {
        if (this.scale === 'linear') { return; }
        this.scale = 'linear';
        this.svg.select('.linear')
            .classed('active',true);
        this.svg.select('.log')
            .classed('active',false);
        this.updateGraph();
    },
    mouseover: function() {
        if (!this.fluxs) { return; }
        this.axisHelper.style('display','block');
    },
    mousemove: function() {
        var rect = this.svg.node().getBoundingClientRect();

        var svgWidth = rect.width;
        var svgX = d3.event.x - rect.left;

        var graphOffset = this.margin.left * svgWidth/280;

        var scale = d3.scaleLinear()
            .domain([graphOffset, svgWidth - this.margin.right*svgWidth/280])
            .range([this.margin.left, 280 - this.margin.right])
            .clamp(true);

        this.axisHelper
            .attr('transform','translate('+ scale(svgX) +',0)');
    },
    mouseout: function() {
        this.axisHelper.style('display','none');
    }
}
