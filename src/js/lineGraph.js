
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
        .attr('transform', 'translate( 260, 15 )')
        .style('pointer-events','none');
    this.textbox.append('rect')
        .attr('fill','white')
        .attr('stroke-width','0.5px')
        .attr('stroke','gray');
    this.textbox.append('g')
        .attr('text-anchor', 'end');

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
        this.textbox.style('display','block').raise();
        this.axisHelper.style('display','block');
    },
    mousemove: function() {
        if (!this.fluxs) { return; }
        var svg = this.svg.node();
        var pt = svg.createSVGPoint();
        pt.x = d3.event.clientX;
        pt.y = d3.event.clientY;
        pt = pt.matrixTransform( svg.getScreenCTM().inverse() );

        if (pt.x < this.margin.left || pt.x > 280 - this.margin.right) { return; }

        this.axisHelper
            .attr('transform','translate('+ pt.x +',0)');

        // var x = d3.scaleLinear()
        //     .domain([this.margin.left, 280 - this.margin.right])
        //     .range(this.x.domain())
        //     .clamp(true);

        // var items = this.fluxs.map( n => n[Math.round(x(pt.x))] )
        //     .sort((a, b) => b.flux - a.flux);

        // // constrain to 3 items
        // if (items.length > 3) {
        //     var startIndex = 0;
        //     items = items.slice(startIndex,3)
        // }

        // var text = this.textbox.select('g');
        // text.selectAll('text').remove();

        // items.forEach((d,i) => {
        //     text.append('text')
        //         .text(d.name + ': ' + d.flux.toPrecision(3))
        //         .attr('font-size', '10px')
        //         .attr('y', i * 14 + 2)
        //         .attr('x', -2);
        // });

        // var width = text.node().getBBox().width + 5;
        // this.textbox.select('rect')
        //     .attr('width', width)
        //     .attr('height', 14 * items.length + 2)
        //     .attr('x', -width)
        //     .attr('y', -10);
    },
    mouseout: function() {
        this.textbox.style('display','none');
        this.axisHelper.style('display','none');
    }
}
