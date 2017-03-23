function Phenotype(path) {
    
    this.container = d3.select('#phenoVis');
    this.svg = this.container.append('svg');

    var margin = {top: 5, left: 50, bottom: 20};

    this.axisHelper = this.svg.append('line')
        .attr('x1', margin.left)
        .attr('x2', margin.left)
        .attr('y1', margin.top)
        .attr('stroke','black')
        .style("stroke-dasharray", "2, 2");
    // this.datalog = this.container.append('div')
    //     .attr('class', 'datalog');

    this.resize = function() {
        var w = this.container.node().getBoundingClientRect().width - 45;
        var h = this.container.node().getBoundingClientRect().height;

        var aspect = w / h;
        var vw = 280;
        var vh = vw / aspect;

        this.width = vw;
        this.height = vh;

        this.svg
            .style("font-size", "12px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)

        this.axisHelper
            .attr('y2', vh - margin.bottom);
    }
    this.resize();

    var csv_ = null;
    d3.csv(path, (csv) => {
        csv_ = csv;
        if (!csv) { 
            console.log('FILE ERROR: could not find ' + path);
            return;
        }

        var data = {};

        csv.columns.forEach(column => data[column] = []);

        csv.forEach(row => {
            for (var entry in row) {
                data[entry].push(row[entry]);
            }
        })

        // calculate axes
        var categories = csv.columns.filter(d => d !== '[T]');
        var values = [].concat.apply([], categories.map(d => data[d]));
        var domain = d3.extent(data['[T]'], d => +d);
        var range = d3.extent(values, d => +d);

        var xAxis = this.svg.append('g')
            .attr('transform', 'translate(0,' + (this.height - margin.bottom) + ')')
            .call(d3.axisBottom(
                d3.scaleLinear()
                    .domain(domain)
                    .range([margin.left, this.width - 1])
                ) )
            .select('path')
                .attr('stroke', 'none');

        var yAxis = this.svg.append('g')
            .attr('transform', 'translate('+ margin.left + ',0)')
            .call(d3.axisLeft(
                d3.scaleLinear()
                    .domain(range)
                    .range([margin.top, this.height - margin.bottom])
                ).ticks(2) )
            .select('path')
                .attr('stroke', 'none');

        // draw paths
        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x((d, i) => i * (this.width - margin.left - 1) / (csv.length - 1) + margin.left)
            .y(d => d * (this.height - margin.bottom - margin.top) + margin.top);

        categories.forEach((column, i) => {
            this.svg.append('path')
                .attr('fill', 'none')
                .style('stroke', d3.schemeCategory10[i])
                .style('stroke-width', 0.5)
                .attr('d', line(data[column]));
        });
    })

    this.drawMarkers = function() {
        var i = App.item;
        if (csv_) {
            this.axisHelper
                .attr('transform','translate('+ i * (this.width - margin.left - 1) / App.dataset.length +',0)');
        }
    }
}