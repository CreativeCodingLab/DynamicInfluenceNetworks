function Phenotype(path) {
    
    this.container = d3.select('#phenoVis');
    var svg = this.container.append('svg');

    var margin = {top: 5, left: 50, bottom: 20};
    var width = 280;
    var height = 200;

    var xAxis = svg.append('g');
    var yAxis = svg.append('g');

    var axisHelper = svg.append('line')
        .attr('x1', margin.left)
        .attr('x2', margin.left)
        .attr('y1', margin.top)
        .attr('stroke','black')
        .style("stroke-dasharray", "2, 2");

    svg
        .on('mousemove', mousemove)
        .on('mouseout', mouseout);

    this.resize = function() {
        var w = this.container.node().getBoundingClientRect().width - 20;
        var h = this.container.node().getBoundingClientRect().height;

        var aspect = w / h;
        var vw = 280;
        var vh = vw / aspect;

        width = vw;
        height = vh;

        svg
            .style("font-size", "12px")
            .attr('width', w)
            .attr('height', h)
            .attr("viewBox", "0 0 " + vw + " " + vh)

        axisHelper
            .attr('y2', vh - margin.bottom);

        if (csv) {
            drawAxes();
            this.updateDomain();
        }
    }
    this.resize();

    var csv = null;
    var categories = null;
    var data = null;
    d3.csv(path, (callback) => {
        csv = callback;
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
        drawAxes();

        // draw paths
        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x((d, i) => i * (width - margin.left - 1) / (csv.length - 1) + margin.left)
            .y(d => d * (height - margin.bottom - margin.top) + margin.top);

        categories.forEach((column, i) => {
            svg.append('path')
                .attr('class', 'category')
                .attr('fill', 'none')
                .style('stroke', d3.schemeCategory10[i])
                .style('stroke-width', 0.5)
                .attr('d', line(data[column]));
        });
    })

    function drawAxes() {
        categories = csv.columns.filter(d => d !== '[T]');
        var values = [].concat.apply([], categories.map(d => data[d]));
        var domain = d3.extent(data['[T]'], d => +d);
        var range = d3.extent(values, d => +d);

        xAxis.attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(d3.axisBottom(
                d3.scaleLinear()
                    .domain(domain)
                    .range([margin.left, width - 1])
                ) )
            .select('path')
                .attr('stroke', 'none');

        yAxis.attr('transform', 'translate('+ margin.left + ',0)')
            .call(d3.axisLeft(
                d3.scaleLinear()
                    .domain(range)
                    .range([margin.top, height - margin.bottom])
                ).ticks(2) )
            .select('path')
                .attr('stroke', 'none');
    }

    this.drawMarkers = function() {
        if (csv) {
            axisHelper
                .attr('transform','translate('+ App.item * (width - margin.left - 1) / App.dataset.length +',0)');
        }
    }

    this.updateDomain = function(domain) {
        if (!domain) {
            domain = [0, csv.length - 1];
        }
        xAxis.call(d3.axisBottom(
                d3.scaleLinear()
                    .domain(domain)
                    .range([margin.left, width - 1])
                ) )
            .select('path')
                .attr('stroke', 'none');

        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x((d, i) => i * (width - margin.left - 1) / (domain[1] - domain[0]) + margin.left)
            .y(d => d * (height - margin.bottom - margin.top) + margin.top);

        svg.selectAll('.category')
            .attr('d', (d, i) => {
                var column = categories[i];
                return line(data[column].slice(domain[0], domain[1]+1));
            });
    }

    function mousemove() {
        var rect = svg.node().getBoundingClientRect();
        var svgWidth = rect.width;
        var svgX = d3.event.x - rect.left;

        var graphOffset = margin.left * svgWidth/280;

        var scale = d3.scaleLinear()
            .domain([graphOffset, svgWidth])
            .range([0, 280 - margin.left])
            .clamp(true);

        axisHelper.attr('transform','translate('+ scale(svgX) +',0)');
    }

    function mouseout() {
        if (csv) {
            axisHelper
                .attr('transform','translate('+ (App.item || 0) * (width - margin.left - 1) / App.dataset.length +',0)');
        }       
    }
}