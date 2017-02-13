function Slider(options) {

    var svg = this.svg = App.panels.forceDirected.svg.append('g');
    var color = (options && options.color) ? options.color : '#eee',
        title = (options && options.title) ? options.title : '',
        domain = (options && options.domain) ? options.domain : [0,1],
        top = this.top = (options && options.top) ? options.top : -70,
        left = this.left = (options && options.left) ? options.left : 0,
        log = (options && options.log === true),
        tabs = options && options.tabs;

    var width = 300;
    var height = 80;

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

    svg.style("font-size", '13px');

    svg.append('g')
        .attr('class','axis')
        .attr('transform','translate(0,35)')
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
        .attr('transform','translate(5,25)')
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
        .attr('text-anchor','start')
        .style('font-weight','bold')
        .attr('x',8)
        .attr('y',tabs ? 0 : 15)
        .text(title);

    if (tabs) {
        this.tabs = tabs.map(label =>
            svg.append('text')
                .attr('text-anchor','start')
                .attr('x',8)
                .attr('y', 17)
                .attr('class','slider-tab')
                .style('cursor','pointer')
                .attr('fill',color)
                .text(label)
        );
        this.tabs[0]
            .classed('active',true);
        this.resizeTabs();
    }


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

Slider.prototype.resize = function() {
    var dx = this.left < 0 ? App.panels.forceDirected.width + this.left-5 : this.left+5,
        dy = this.top < 0 ? App.panels.forceDirected.height + this.top: this.top;
    this.svg.attr('transform','translate('+dx+','+dy+')');
    this.resizeTabs();
}

Slider.prototype.resizeTabs = function() {
    if (this.tabs) {
        this.tabs.forEach((tab, i) => {
            if (i > 0) {
                let prevTab = this.tabs[i-1].node().getBBox();
                tab.attr('x', prevTab.x + prevTab.width + 10);
            }
        })        
    }
}