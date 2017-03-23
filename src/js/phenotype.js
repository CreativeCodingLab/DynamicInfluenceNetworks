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
            .style('margin-left', '15px')
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
        function values(d) {
            return Object.keys(d)
                .filter(key => key !== '[T]')
                .map(y => +d[y]);
        }
        var ymin = d3.min( csv, d => d3.min(values(d)) );
        var ymax = d3.max( csv, d => d3.max(values(d)) );

        var xmin = d3.min( data['[T]'].map(x => +x) );
        var xmax = d3.max( data['[T]'].map(x => +x) );


        // draw paths
        var line = d3.line()
            .curve(d3.curveCatmullRom)
            .x((d, i) => i * this.width / xmax / 10)
            .y(d => d * this.height);

        csv.columns.forEach((column, i) => {
            this.svg.append('path')
                .attr('fill', 'none')
                .style('stroke',color(i))
                .style('stroke-width', 0.5)
                .attr('d', line(data[column]));
        })
    })

    function color(i) {
        return d3.schemeCategory20[i];
    }
}