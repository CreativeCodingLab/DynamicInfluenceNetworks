function Slider(options) {

    this.svg = App.panels.forceDirected.svg.append('g');
    var title = (options && options.title) ? options.title : '',
        tabs = options && options.tabs;

    this.color = (options && options.color) ? options.color : '#eee';
    this.domain = (options && options.domain) ? options.domain : [0,1];    
    this.top = (options && options.top) ? options.top : -70,
    this.left = (options && options.left) ? options.left : 0;

    var log = this.log = (options && options.log === true);
    var width = this.width = 300;
    var height = this.height = 80;

    this.resize();

    var self = this;
    var drag = d3.drag()
        .on('drag', function() { 
            if (d3.event.dx === 0) { return; }

            var x = d3.event.x - 5;
            if (x < 0) {
                x = 0;
            }
            else if (x > width - 20) {
                x = width - 20;
            }
            d3.select(this).attr('x', x);

            // get/set value
            self.value = self.scale.copy().invert(x + 10);

            self.onDrag(x, d3.event);

        })
        .on('end', function() {
            self.onDragEnd(self.value, d3.event);
        });

    this.scale = (log ? d3.scaleLog() : d3.scaleLinear())
        .range([10, width-10])
        .domain(this.domain)
        .clamp(true);

    this.axis = d3.axisBottom()
        .scale(this.scale)
        .ticks(4)
        .tickSize(8);

    if (!log) { this.axis.tickFormat(d => parseInt(App.format.start+d)); }

    this.svg.style("font-size", '13px');

    this.svg.append('g')
        .attr('class','axis')
        .attr('transform','translate(0,35)')
        .call(this.axis);

    this.svg.select('.axis path')
        .attr('stroke-width',2)
        .attr('stroke',this.color);
    this.svg.selectAll('.axis line')
        .attr('stroke-width',2)
        .attr('stroke',this.color);
    this.svg.selectAll('.axis text')
        .attr('fill',this.color);

    this.svg.append('g')
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

    this.svg.append('text')
        .attr('class','title')
        .attr('pointer-events','none')
        .attr('text-anchor','middle')
        .attr('fill',this.color)
        .attr('text-anchor','start')
        .style('font-weight','bold')
        .attr('x',8)
        .attr('y',tabs ? 0 : 15)
        .text(title);

    if (tabs) {
        this.tabs = tabs.map((label, i) => {
            let tab = this.svg.append('text')
                .attr('text-anchor','start')
                .attr('x',8)
                .attr('y', 17)
                .attr('class','slider-tab')
                .style('cursor','pointer')
                .attr('fill',this.color)
                .text(label);

            tab.on('click', () => {
                this.activeTab = this.activeTab || 0;
                // store previous tab's position
                this.tabs[this.activeTab]
                    .attr('position', this.svg.select('.slider').attr('x'));

                this.tabs.forEach((t, j) => {
                    t.classed('active', i == j);
                });
                this.activeTab = i;

                // retrieve new tab's position
                var x = tab.attr('position') || 0;
                this.setPosition( x , true);

                // perform click event
                this.value = this.scale.copy().invert(x + 10);
                this.onTabClick(this.value);
            })

            return tab;
        });
        this.activeTab = 0;
        this.tabs[0]
            .classed('active',true);
        this.resizeTabs();
    }

};

Slider.prototype.setPosition = function(x, absolute) {
    x = absolute ? x : this.scale(x) - 10;
    this.svg.select('.slider')
        .attr('x', x);
}

Slider.prototype.setTitle = function(title) {
    this.svg.select('.title')
        .text(title);
}

Slider.prototype.setDomain = function(arr) {
    this.domain = arr;
    this.scale.domain(this.domain);
    this.axis.scale = this.scale;
    this.svg.select('.axis')
        .call(this.axis);

    this.svg.selectAll('.axis line')
        .attr('stroke-width',2)
        .attr('stroke',this.color);
    this.svg.selectAll('.axis text')
        .attr('fill',this.color);
}

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

/* event handling */
Slider.prototype.onTabClick = function(x) {
    // console.log('tab', x)
}

Slider.prototype.onDrag = function(x, evt) {
    // console.log('dragging',x, evt);
}

Slider.prototype.onDragEnd = function(x, evt) {
    // console.log('drag end', x, evt);
}

