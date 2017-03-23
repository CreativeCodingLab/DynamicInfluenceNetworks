function Phenotype(path) {
    
    this.container = d3.select('#phenoVis');
    this.svg = this.container.append('svg');

    this.resize = function() {
        var w = this.container.node().getBoundingClientRect().width - 45;
        var h = this.container.node().getBoundingClientRect().height;

        var aspect = w / h;
        var vw = 320;
        var vh = vw / aspect;

        this.width = vw;
        this.height = vh;

        this.svg
            .style("font-size", "12px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)
    }
    this.resize();

    d3.csv(path, (csv) => {

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
        var range = d3.extent(values, d => +d);

        var margin = {top: 10, left: 75, bottom: 20};

        var axisX = this.svg.append('g')
            .attr('transform', 'translate(0,' + (this.height - margin.bottom) + ')')
            .call(d3.axisBottom(
                d3.scaleLinear()
                    .domain([0, csv.length - 1])
                    .range([margin.left, this.width - 1])
                ) )
            .select('path')
                .attr('stroke', 'none');

        var axisY = this.svg.append('g')
            .attr('transform', 'translate('+ margin.left + ',0)')
            .call(d3.axisLeft(
                d3.scaleLinear()
                    .domain(range)
                    .range([margin.top, this.height - margin.bottom])
                ) )
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
}