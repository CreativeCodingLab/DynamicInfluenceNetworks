function Slider(selector, options) {

    var svg = d3.select( selector ? selector : 'body' ).append('svg'),
        width = (options && options.width > 0) ? options.width : d3.select(".controls").node().clientWidth * .45,
        height = (options && options.height > 0) ? options.height : d3.select(".controls").node().clientHeight * 0.2,
        title = (options && options.title) ? options.title : ''
        domain = (options && options.domain) ? options.domain : [0,1];

    var self = this;
    var drag = d3.drag()
        .on('drag', function() { 
            var x = Math.min(Math.max(d3.event.x - 5, 0), width-20);
            d3.select(this).attr('x', x);
            self.onDrag(x);
        })
        .on('end', function() {
            var x = Math.round(Math.min(Math.max(d3.event.x - 5, 0), width-20));
            d3.select(this).attr('x', x);
            self.onDragEnd(x);
        });

    var scale = d3.scaleLinear()
        .range([10, width-10])
        .domain(domain)
        .clamp(true);

    var axis = d3.axisBottom()
        .scale(scale)
        .ticks(4)
        .tickSize(10);

    svg.attr('height', height)
        .attr('width',width);
    svg.append('g')
        .attr('class','axis')
        .attr('transform','translate(0,8)')
        .call(axis);

    svg.select(".axis")
        .style("font-size", '1.2vmin')

    svg.append('g')
        .attr('transform','translate(5,0)')
    .append('rect')
        .attr('class','slider')
        .attr('rx',3)
        .attr('ry',3)
        .attr('fill','#aaa')
        .attr('width',10)
        .attr('height',16)
        .call(drag);

    svg.append('text')
        .attr('class','title')
        .attr('pointer-events','none')
        .attr('text-anchor','middle')
        .attr('fill','black')
        .attr('font-size','1.25vmin')
        .attr('x',width/2)
        .attr('y',height)
        .text(title);

    this.setTitle = function(title) {
        svg.select('.title')
            .text(title);
    }

    this.setDomain = function(arr) {
        domain = arr;
        scale.domain(domain);
        sliderScale.range(domain);
        axis.scale = scale;
        svg.select('.axis').call(axis);
    }

    this.sliderScale = d3.scaleLinear()
        .domain([0, width-20])
        .range(domain);

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
