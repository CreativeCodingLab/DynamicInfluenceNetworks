function Phenotype(path) {
    
    this.container = d3.select('#phenoVis');
    this.svg = this.container.append('svg');

    var margin = {top: 5, left: 50, bottom: 20};
    var xAxis = this.svg.append('g');
    var yAxis = this.svg.append('g');

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
    var categories = null;
    var data = null;
    d3.csv(path, (csv) => {
        csv_ = csv;
        if (!csv) { 
            console.log('FILE ERROR: could not find ' + path);
            return;
        }

        data = {};

        csv.columns.forEach(column => data[column] = []);

        csv.forEach(row => {
            for (var entry in row) {
                data[entry].push(row[entry]);
            }
        })

        // calculate axes
        categories = csv.columns.filter(d => d !== '[T]');
        var values = [].concat.apply([], categories.map(d => data[d]));
        var domain = d3.extent(data['[T]'], d => +d);
        var range = d3.extent(values, d => +d);

        xAxis.attr('transform', 'translate(0,' + (this.height - margin.bottom) + ')')
            .call(d3.axisBottom(
                d3.scaleLinear()
                    .domain(domain)
                    .range([margin.left, this.width - 1])
                ) )
            .select('path')
                .attr('stroke', 'none');

        yAxis.attr('transform', 'translate('+ margin.left + ',0)')
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
                .attr('class', 'category')
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

    this.updateDomain = function(domain) {
        xAxis.call(d3.axisBottom(
                d3.scaleLinear()
                    .domain(domain)
                    .range([margin.left, this.width - 1])
                ) )
            .select('path')
                .attr('stroke', 'none');

        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x((d, i) => i * (this.width - margin.left - 1) / (domain[1] - domain[0]) + margin.left)
            .y(d => d * (this.height - margin.bottom - margin.top) + margin.top);

        this.svg.selectAll('.category')
            .attr('d', (d, i) => {
                var column = categories[i];
                return line(data[column].slice(domain[0], domain[1]+1));
            });
    }
}