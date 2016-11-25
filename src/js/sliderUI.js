window.addEventListener('load', function() {

    var width = 300, height = 45;

    var sliderRange = [0, 280]

    var drag = d3.drag()
          .on('drag', function(d) { 
            d3.select(this)
                .attr('x', Math.min(Math.max(d3.event.x - 5, 0), width-20));
          })
          .on('end', function(d) {
            var x = Math.round(Math.min(Math.max(d3.event.x - 5, 0), width-20));
            d3.select(this)
                .attr('x', x);
//            console.log(x)
          })

    var createSlider = function(div, title, domain) {
        var scale = d3.scaleLinear()
            .range([10, width-10])
            .domain(domain || [0,1]);

        var axis = d3.axisBottom()
            .scale(scale)
            .ticks(4)
            .tickSize(10);

        var svg = div.append('svg')
            .attr('width', width)
            .attr('height', height)

        svg.append('g')
            .attr('class','axis')
            .attr('transform','translate(0,8)')
            .call(axis);

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
            .attr('text-anchor','middle')
            .attr('fill','black')
            .attr('font-size','12px')
            .attr('x',width/2)
            .attr('y',height);

        return svg;
    }

    var cSlider = createSlider(d3.select('#clusterSlider'));

    cSlider.select('.title')
        .text('Influence threshold');


    var tSlider = createSlider(d3.select('#timeSlider'));

    tSlider.select('.title')
        .text('Time');
})