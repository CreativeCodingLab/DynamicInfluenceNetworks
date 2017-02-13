function Slider(options) {

    var svg = this.svg = App.panels.forceDirected.svg.append('g');
    var color = (options && options.color) ? options.color : '#eee',
        title = (options && options.title) ? options.title : '',
        domain = (options && options.domain) ? options.domain : [0,1],
        top = (options && options.top) ? options.top : -60,
        left = (options && options.left) ? options.left : 0,
        log = (options && options.log === true);

    var width = 300;
    var height = 50;

    this.resize = function() {
        var dx = left < 0 ? App.panels.forceDirected.width + left-5 : left+5,
            dy = top < 0 ? App.panels.forceDirected.height + top: top;
        svg.attr('transform','translate('+dx+','+dy+')');
    }
    this.resize();

    var self = this;
    var drag = d3.drag()
        .on('drag', function() { 
            if (d3.event.dx === 0) { return; }

            // limit event firing when out of range
            var x = d3.event.x - 5;
            if ( x < 0 || (!log && x > width-20) || (log && x > width)) {
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
                    x = log ? width : width - 20;
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
            var x = d3.event.x-5;
            x = scale(self.sliderScale(x)) - 10;
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

    svg.append('g')
        .attr('class','axis')
        .attr('transform','translate(0,25)')
        .style("font-size", '11px')
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

};
