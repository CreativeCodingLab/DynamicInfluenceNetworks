var App = App || {};

function createForceDirectedGraph() {
  var svg = App.panels.forceDirected.svg;
  var width = App.panels.forceDirected.width;
  var height = App.panels.forceDirected.height;

  // allows all work to be done using same coordinates initially used
  // no need to redraw on resize
  svg.attr("viewBox", "0 0 " + width + " " + height);

  // background color
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "lightgray");


  var linkGroup = svg.append("g")
    .attr("class", "linkGroup");

  var nodeGroup = svg.append("g")
    .attr("class", "nodeGroup");

  /* Initialize tooltip for nodes */
  let node_tip = d3.tip ? d3.tip().attr('class', 'd3-tip')
    .html(function(d) {
      return "Rule: <span style='color:red;'>" + d.name + "</span>";
    }) :
    function() {
      alert("! d3.tip MISSING ! \nDo you have an internet connection?");
    };

  /* Initialize tooltip for links */
  let link_tip = d3.tip ? d3.tip().attr('class', 'd3-tip').direction('e')
    .html(function(d) {
      if (d.value < 0) { 
        return d.source + " infl.<br>" + "on " + d.target + "<br><span style='color:#e31a1c;'>" + d.value.toFixed(3) + "</span>";
      } else {
        return d.source + " infl.<br>" + "on " + d.target + "<br><span style='color:#33a02c;'>" + d.value.toFixed(3) + "</span>";
      }
      
    }) :
    function() {
      alert("! d3.tip MISSING ! \nDo you have an internet connection?");
    };

  /* Invoke the tip in the context of your visualization */
  svg.call(node_tip);
  svg.call(link_tip);

  App.panels.forceDirected.filteredData = {};
  App.panels.forceDirected.links = [];

  for (var key in App.data) {
    var newNode = {
      hits: App.data[key].hits,
      name: App.data[key].name,
      inf: App.data[key].inf.filter(l => l.flux !== 0)
    }

    newNode.inf.forEach(l => {
      App.panels.forceDirected.links.push({
        source: key,
        target: l.name,
        value: l.flux
      });
    })

    if (newNode.inf.length > 0) {
      App.panels.forceDirected.filteredData[key] = newNode;
    }
  }

  console.log("filteredData:", App.panels.forceDirected.filteredData);

  drawGraph();


  // drawing methods
  function drawGraph() {
    var filteredData = App.panels.forceDirected.filteredData;

    var svg = App.panels.forceDirected.svg;
    var width = App.panels.forceDirected.width;
    var height = App.panels.forceDirected.height;

    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(filteredData), (d) => {
        return filteredData[d].hits;
      }))
      .range([5, 10]);

    var strokeScale = d3.scaleLinear()
      .domain(d3.extent(App.panels.forceDirected.links, (d) => {
        return Math.abs(d.value);
      }))
      .range([2, 5]);

    for (var key in filteredData) {
      filteredData[key].x = width / 2;
      filteredData[key].y = height / 2; 
    }

    nodeGroup.selectAll(".rule")
      .data(Object.keys(filteredData))
    .enter().append("circle")
      .datum((d) => {
        return filteredData[d];
      })
      .attr("class", "rule")
      .attr("transform", (d, i) => {
        return "translate(" + d.x + ", " + d.y + ")";
      })
      .attr("r", (d) => {
        return radiusScale(d.hits);
      })
      .style("fill", "#a6cee3")
      .style("stroke", "#1f78b4")
      .style("stroke-width", 2)
      .on('mouseover', node_tip.show)
      .on("mouseout", node_tip.hide);

    linkGroup.selectAll(".link")
      .data(App.panels.forceDirected.links)
    .enter().append("line")
      .attr("class", "link")
      .attr("x1", (d) => {
        return filteredData[d.source].x;
      })
      .attr("y1", (d) => {
        return filteredData[d.source].y;
      })
      .attr("x2", (d) => {
        return filteredData[d.target].x;
      })
      .attr("y2", (d) => {
        return filteredData[d.target].y;
      })
      .style("stroke", (d) => {
        return d.value > 0 ? "#33a02c" : "#e31a1c";
      })
      .style("stroke-width", (d) => {
        return strokeScale(Math.abs(d.value));
      })
      .on("mouseover", link_tip.show)
      .on("mouseout", link_tip.hide);


    createForceLayout();

    function randX() {
      return Math.round(Math.random() * (width));
    }

    function randY() {
      return Math.round(Math.random() * (height));
    }
  }

  function createForceLayout() {
    var data = App.panels.forceDirected.filteredData;

    var nodeArr = Object.keys(App.panels.forceDirected.filteredData).map(n => App.panels.forceDirected.filteredData[n]);

    var borderNodeMargin = 10;

    var clampX = d3.scaleLinear()
      .domain([16 + borderNodeMargin, width - 16 - borderNodeMargin])
      .range([16 + borderNodeMargin, width - 16 - borderNodeMargin])
      .clamp(true);

    var clampY = d3.scaleLinear()
      .domain([16 + borderNodeMargin, height - 16 - borderNodeMargin])
      .range([16 + borderNodeMargin, height - 16 - borderNodeMargin])
      .clamp(true);

    var node = nodeGroup.selectAll(".rule");

    var link = linkGroup.selectAll(".link");


    var simulation = d3.forceSimulation()
      .force("link", 
        d3.forceLink()
          .id(d => d.name)
          .strength(d => d.value * 5)
      )
      .force("collision", d3.forceCollide(Math.sqrt(Math.pow(16, 2) + Math.pow(24, 2)) + 5))
      .force("charge", d3.forceManyBody().strength(-50))
      .force("center", d3.forceCenter(
        (width / 2),
        (height / 2)
      ));

    simulation
      .nodes(nodeArr)
      .on("tick", () => {
        node
          .datum((d) => {
            d.x = clampX(d.x);
            d.y = clampY(d.y);
            return d;
          })
          .attr("transform", (d) => {
            return "translate(" + d.x + "," + d.y + ")";
          });

        link
          .attr("x1", (d) => {
            // console.log(d);
            // console.log(data[d.source]);
            // console.log(data[d.target]);

            return data[d.source].x;
          })
          .attr("x2", (d) => {
            return data[d.target].x;
          })
          .attr("y1", (d) => {
            return data[d.source].y;
          })
          .attr("y2", (d) => {
            return data[d.target].y;
          });

      });

    // simulation.force("link")
    //     .links(App.panels.forceDirected.links);
  }
}


