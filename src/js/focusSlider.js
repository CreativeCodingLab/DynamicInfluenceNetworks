function FocusSlider(selector) {
    this.container = document.querySelector(selector) || document.body;
    this.svg = d3.select( this.container ).append('svg');

    this.margin = {top: 5, left: 50, bottom: 20, right: 20};
    this.axis = this.svg.append('g');

    this.bgraph = this.svg.append("g")
        .attr("class", "brush");

    this.resize();
    this.update();
}

FocusSlider.prototype = {
    constructor: FocusSlider,
    resize: function() {
        var w = this.container.getBoundingClientRect().width - this.margin.right;
        var h = this.container.getBoundingClientRect().height;
        var aspect = w / h;
        var vw = 280;
        var vh = vw / aspect;

        this.width = vw;
        this.height = vh - this.margin.bottom;

        this.svg
            .style("font-size", "12px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)

        if(this.x)        
            this.x.range([this.margin.left, this.width - 1]);

        this.drawAxes();
        if (!this.brush) {
            this.drawBrush();
        }
    },
    drawAxes: function() {
        if (!this.x) { return; }
        this.axis
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
    },
    drawBrush: function() {
        if (!this.x) { return; }
        this.brush = d3.brushX()
            .extent([[this.margin.left, 0], [this.width, this.height]])
            .on("brush end", this.brushed.bind(this));
        this.bgraph
            .call(this.brush)
            .call(this.brush.move, this.x.range());
    },
    brushed: function() {
        var topVis = App.panels.topVis;
        var botVis = App.panels.bottomVis;

        var s = d3.event.selection || this.x.range();
        var domain = s.map(this.x.invert, this.x);
        domain[0] = Math.round(domain[0]);
        domain[1] = Math.round(domain[1]);
        if (domain[0] !== domain[1]) {
            if (topVis && topVis.x) {
                topVis.x.domain(domain);
                topVis.updateFluxs();
                topVis.updateGraph();
            }
            if (botVis && botVis.x) {
                botVis.x.domain(domain);
                botVis.updateFluxs();
                botVis.updateGraph();
            }
            if (App.phenotype) {
                App.phenotype.updateDomain(domain);
            }
        }
    },
    update: function() {
        this.x = d3.scaleLinear()
                .domain([0, App.dataset.length - 1])
                .range([this.margin.left, this.width - 1]);
        this.drawAxes();
        this.drawBrush();
    }
}