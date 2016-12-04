function Slider(selector, options) {

    var svg = d3.select( selector ? selector : 'body' ).append('svg'),
        color = (options && options.color) ? options.color : '#eee',
        title = (options && options.title) ? options.title : '',
        domain = (options && options.domain) ? options.domain : [0,1],
        log = (options && options.log === true);


    var containerWidth = App.panels.forceDirected.svg.node().clientWidth;
    var width = 300;
    var height = 50;
    svg.attr("viewBox", "0 0 " + 300 + " " + 50);

    var self = this;
    var drag = d3.drag()
        .on('drag', function() { 

            // limit event firing when out of range
            var x = d3.event.x - 5;
            if ( x < 0 || x > width-20) {
                if (x < 0) {
                    self.max = false;
                    if (self.min) { return; }
                    self.min = true;
                    x = 0;
                }
                else {
                    self.min = false;
                    if (self.max) { return; }
                    self.max = true;
                    x = width - 20;
                }
            }
            else { self.max = self.min = false; }

            // perform event
            d3.select(this).attr('x', x);
            self.x = x;
            self.value = self.sliderScale(x);
            self.onDrag(x, d3.event);
        })
        .on('end', function() {
            var x = Math.round(Math.min(Math.max(d3.event.x - 5, 0), width-20));
            d3.select(this).attr('x', x);
            self.onDragEnd(x, d3.event);
        });

    var scale = (log ? d3.scaleLog() : d3.scaleLinear())
        .range([10, width-10])
        .domain(domain)
        .clamp(true);

    var axis = d3.axisBottom()
        .scale(scale)
        .ticks(4)
        .tickSize(8);

    if (!log) { axis.tickFormat(d => parseInt(App.format.start+d)); }

    svg.attr('height', height)
        .attr('width',width);
    svg.append('g')
        .attr('class','axis')
        .attr('transform','translate(0,25)')
        .style("font-size", '12px')
        .call(axis);

    svg.select('.axis path')
        .attr('stroke-width',2)
        .attr('stroke',color);
    svg.selectAll('.axis line')
        .attr('stroke-width',2)
        .attr('stroke',color);
    svg.selectAll('.axis text')
        .attr('fill',color);

    svg.append('g')
        .attr('transform','translate(5,17)')
    .append('rect')
        .attr('class','slider')
        .attr('stroke','#444')
        .style('pointer-events','all')
        .attr('rx',2)
        .attr('ry',2)
        .attr('fill','#bbb')
        .attr('width',10)
        .attr('height',16)
        .call(drag);

    svg.append('text')
        .attr('class','title')
        .attr('pointer-events','none')
        .attr('text-anchor','middle')
        .attr('fill',color)
        .attr('font-size','12px')
        .attr('text-anchor','start')
        .attr('x',8)
        .style('font-weight','bold')
        .attr('y',12)
        .text(title);


    this.setTitle = function(title) {
        svg.select('.title')
            .text(title);
    }

    this.setDomain = function(arr) {
        domain = arr;
        scale.domain(domain);
        if (log) {
            this.sliderScale = scale.copy().range([0, width-20]).invert;
        }
        else {
            this.sliderScale.range(domain);
        }
        axis.scale = scale;
        svg.select('.axis')
            .call(axis);

        svg.selectAll('.axis line')
            .attr('stroke-width',2)
            .attr('stroke',color);
        svg.selectAll('.axis text')
            .attr('fill',color);
    }

    if (log) {
        this.sliderScale = scale.copy().range([0, width-20]).invert;
    }
    else {
        this.sliderScale = d3.scaleLinear()
            .range(domain)
            .domain([0, width-20]);
    }

    this.onDrag = function(x) {
        // console.log('dragging',x);
    }
    this.onDragEnd = function(x) {
        // console.log('drag end', x);
    }

    this.setPosition = function(x, absolute) {
        this.x = (absolute ? x : scale(x)) -10;
        svg.select('.slider')
            .attr('x', this.x);
    }

    this.resize = function( ) {

        var cw = App.panels.forceDirected.svg.node().clientWidth;
        svg.attr('width', cw/containerWidth*300)
            .attr('height',cw/containerWidth*50);
    }
};
