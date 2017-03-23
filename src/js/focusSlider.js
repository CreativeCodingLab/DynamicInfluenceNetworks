function FocusSlider(selector) {
    this.container = document.querySelector(selector) || document.body;
    this.svg = d3.select( this.container )
                            .append('svg');

    this.svg.append('rect')
        .attr('class', 'focus')
        .attr('fill','transparent');

    this.margin = {top: 10, right: 20, bottom: 30, left: 60};

    var graph = this.graph = this.svg.append('g')
        .attr('class', 'focus-slider')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    graph.append('g')
        .attr('class','axis-fx');
    
    var bgraph = this.bgraph = graph.append("g")
            .attr("class", "brush");

    this.resize();
}

FocusSlider.prototype = {
    constructor: FocusSlider,
    resize: function() {
        var w = this.container.getBoundingClientRect().width - 45;
        var h = this.container.getBoundingClientRect().height;
        var aspect = w / h;
        var vw = 320;
        var vh = vw / aspect;

        this.width = vw - this.margin.right - this.margin.left;
        this.height = vh - this.margin.top - this.margin.bottom;

        this.svg
            .style('margin-left', '15px')
            .style("font-size", "12px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)
        .select('rect')
            .attr('width', w)
            .attr('height', h);

        if(this.x)        
            this.x.range([0, this.width]);

        this.drawAxes();
        this.drawBrush();
    },
    drawAxes: function() {
        if (!this.x) { return; }
        this.svg.select('.axis-fx')
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
                );

        this.svg.select('.axis-fx path')
            .style('display','none');
    },
    drawBrush: function() {
        if (!this.x) { return; }
        var bgraph = this.bgraph;
        var brush = this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on("brush end", this.brushed.bind(this));
        bgraph
            .call(brush)
            .call(brush.move, this.x.range());
    },
    brushed: function() {
        var topVis = App.panels.topVis;
        var botVis = App.panels.bottomVis;
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || this.x.range();
        var domain = s.map(this.x.invert, this.x);
        domain[0] = Math.round(domain[0]);
        domain[1] = Math.round(domain[1]);
        if (domain[0] !== domain[1]) {
            topVis.x.domain(domain);
            topVis.updateFluxs();
            topVis.updateGraph();
            botVis.x.domain(domain);
            botVis.updateFluxs();
            botVis.updateGraph();

            App.phenotype.updateDomain(domain);
        }
    },
    update: function() {
        this.x = d3.scaleLinear()
                .domain([0, App.dataset.length - 1])
                .range([0, this.width]);
        this.drawAxes();
        this.drawBrush();
    }
}