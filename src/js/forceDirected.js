var App = App || {};

function createForceDirectedGraph() {
  var svg = App.panels.forceDirected.svg;
  var width = App.panels.forceDirected.width;
  var height = App.panels.forceDirected.height;

  // allows all work to be done using same coordinates initially used
  // no need to redraw on resize
  svg.attr("viewBox", "0 0 " + width + " " + height);

  // svg test code
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "black");

  svg.append("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", d3.min([width, height]) / 4)
    .style("fill", "red");
}
