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
    .style("padding", "20px")
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
  let link_tip = d3.tip ? 
      d3.tip().attr('class', 'd3-tip')
        .direction('e')
        .html(function(d) {
          if (d.value < 0) { 
            return d.source.name + " infl.<br>" + "on " + d.target.name + "<br><span style='color:#e31a1c;'>" + d.value.toFixed(3) + "</span>";
          } else {
            return d.source.name + " infl.<br>" + "on " + d.target.name + "<br><span style='color:#33a02c;'>" + d.value.toFixed(3) + "</span>";
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
  App.panels.forceDirected.nclusterNodes = [];
  App.panels.forceDirected.pclusterNodes = [];
  var nthreshold = -5;
  var pthreshold = 5;
  
  // need to generate cluster data before actual nodes are generated
  // sort clusterData by value
  for (var clusterKey in App.data) {

    var clusterInfp = App.data[clusterKey].inf.filter(l => l.flux > 0);
    var clusterInfn = App.data[clusterKey].inf.filter(l => l.flux < 0);

    // divide nodes into positive and negative for easier clustering
    clusterInfp.forEach(l => {
      App.panels.forceDirected.pclusterNodes.push({
        source: clusterKey,
        target: l.name,
        value: l.flux
      });
    })

    clusterInfn.forEach(l => {
      App.panels.forceDirected.nclusterNodes.push({
        source: clusterKey,
        target: l.name,
        value: l.flux
      });
    })  
    //sort nodes
    App.panels.forceDirected.pclusterNodes.sort(function(a,b) {
       return parseFloat(a.value) - parseFloat(b.value)
    });
    App.panels.forceDirected.nclusterNodes.sort(function(a,b) {
       return parseFloat(b.value) - parseFloat(a.value)
    });
  }

  defineClusters(nthreshold, pthreshold);
  
  for (var key in App.data) {
    var newNode = {
      hits: App.data[key].hits,
      name: App.data[key].name,
      inf: App.data[key].inf.filter(l => l.flux !== 0),
      outf: App.data[key].outf.filter(l => l.flux !== 0),
      cluster: getCluster(key)
    }

    newNode.inf.forEach(l => {
      App.panels.forceDirected.links.push({
        source: key,
        target: l.name,
        value: l.flux
      });
    })

    if (newNode.inf.length > 0 || newNode.outf.length > 0) {
      App.panels.forceDirected.filteredData[key] = newNode;
    }
  }

  console.log("filteredData:", App.panels.forceDirected.filteredData);
  drawGraph();

  var simulation;

  // drawing methods
  function drawGraph() {
    var filteredData = App.panels.forceDirected.filteredData;

    var svg = App.panels.forceDirected.svg;
    var width = App.panels.forceDirected.width;
    var height = App.panels.forceDirected.height;

    drawNodes(filteredData, width, height);
    drawLinks(filteredData, width);

    createForceLayout();

    // function randX() {
    //   return Math.round(Math.random() * (width));
    // }

    // function randY() {
    //   return Math.round(Math.random() * (height));
    // }
  }

  // draw nodes in graph
  function drawNodes(filteredData, width, height) {
    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(filteredData), (d) => {
        return filteredData[d].hits;
      }))
      .range([5, 10]);

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
      .style("fill", "#abd9e9")
      .style("stroke", "#2c7bb6")
      .style("stroke-width", 2)
      .on('mouseover', node_tip.show)
      .on("mouseout", node_tip.hide)
      .on('click', function(d) {
        d3.select(this)
          .style("fill", "#abd9e9")
          .style("stroke", "#2c7bb6");

        d.fx = d.fy = null; 
      })
      .call( 
        d3.drag()
          .on('start', function(d) {
            if (!d3.event.active) {
              simulation.alphaTarget(0.3).restart();
            }
          })
          .on('drag', function(d) { 
            d3.select(this)
              .style("fill", "#bababa")
              .style("stroke", "#404040");
            d.fx = d3.event.x, 
            d.fy = d3.event.y;
          })
          .on('end', function(d) {
            if (!d3.event.active) {
              simulation.alphaTarget(0);
            }
          }) );

  }

  // draw links in graph
  function drawLinks(filteredData, width) {
    var sortedInfl = App.panels.forceDirected.links.sort((a, b) => {
      return Math.abs(b.value) - Math.abs(a.value);
    });

    maxInfl = Math.abs(sortedInfl[Math.round(sortedInfl.length/2)].value) * 2;



    var strokeScale = d3.scaleLinear()
      .domain([0, maxInfl])
      .range([0.3, 1])
      .clamp(true);

    var linkGroupElement = linkGroup.selectAll(".linkElement")
      .data(App.panels.forceDirected.links)
    .enter().append("g")
      .attr('class', 'linkElement')
      .attr('fill','none');

    // main line
    linkGroupElement.append('path')
      .attr("class", "link")
      .style("stroke", (d) => {
        return d.value > 0 ? "#33a02c" : "#e31a1c";
      })
      .style("stroke-width", (d) => {
        return strokeScale(Math.abs(d.value));
      });

    // invisible line for collisions
    linkGroupElement.append('path')
      .attr("class", "link")
      .style("stroke", 'rgba(0,0,0,0)')
      .style("stroke-width", 8)
      .on("mouseover", (d, i) => {
        d3.select(event.target)
          .style('stroke', d.value > 0 ? // "#33a02c" : "#e31a1c"
                "rgba(51,160,44,0.5)" : "rgba(227,26,28,0.5)"
            );
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y;
        var ex = event.x - d.target.x + 20,
            ey = event.y - d.target.y;

        if (event.x < width-300) {
          link_tip
            .direction('e')
            .offset([dy/2+ey, (dx < 0) ? dx+ex : ex])
            .show(d,i);
        }
        else {
          var ex = event.x - d.source.x - 20,
              ey = event.y - d.source.y;
          link_tip
            .direction('w')
            .offset([-dy/2+ey, (dx < 0) ? -dx+ex : ex])
            // .offset([dy/2+ey, (dx < 0) ? dx+ex : ex])
            .show(d,i);
        }
      })
      .on("mouseout", (d, i) => {
        d3.select(event.target)
          .transition()
          .style('stroke','rgba(0,0,0,0)');
        link_tip.hide(d,i);
      });
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

    simulation = d3.forceSimulation()
      .force("link", 
        d3.forceLink()
          .id(d => d.name)
          // .strength(function(d){ console.log('hello',d);return 5;d.value * 5})
      )
      .force("collision", d3.forceCollide(15))
      .force("charge", d3.forceManyBody().strength(-150))
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
          .attr('d', function(d) {
            var target = d.source,
                source = d.target;

            // console.log(d);

            // if (!target || !source ) { return ""; }

            var dx = target.x - source.x,
                dy = target.y - source.y,
                dr = Math.sqrt(dx * dx + dy * dy)*2;

            if (dr == 0) { return ""; }

            var nx = -24* dx / dr,
                ny = -24*dy / dr;

            // normal ellipse version...
            return  "M" + source.x + "," + source.y + 
                    "A" + dr + "," + dr + " 0 0,1 " + 
                    (target.x+nx) + "," + (target.y+ny)+
                    "m" + (nx-ny/2) + ',' + (ny+nx/2) + 
                    "L" + (target.x+nx) + "," + (target.y+ny) +
                    "l" + (nx+ny/2) + ',' + (ny-nx/2);

          // ?????
          //   var cw = (dx > 0) || (dx == 0 && dy > 0);
          //   return cw ? 
          //     "M" + source.x + "," + source.y + "A" + dr + "," + dr + " 0 0,1 " + target.x + "," + target.y :
          //     "M" + target.x + "," + target.y + "A" + dr*.8 + "," + dr*.8 + " 0 0,1 " + source.x + "," + source.y ;
          });
      });

    simulation.force("link")
        .links(App.panels.forceDirected.links)
        .distance((d) => {
          return d.value < 0 ? 100 : 30;
        })
        // .strength((d) => {
          
        // })
        // .strength((d) => {
        //   return 1;
        //   var count = function(node) {
        //     return App.panels.forceDirected.links
        //         .filter(link => link.target === node)
        //         .length;
        //   }
        //   var cs = count(d.source), ct = count(d.target);
        //   if (Math.min(cs, ct) < 1) {
        //     console.log('strength',0)
        //   }
        //   // console.log(cs, ct);
        //   return 1 / Math.min(count(d.source), count(d.target));
        // })
  }

  function getCluster(key) {
    var found = App.panels.forceDirected.clusters.filter(l => l.source === key)
    if(found.length!=0) {
      return found[0].cluster;
    }
    else {
      return 0;
    }
  }

 function checkFound(popped) {
   var foundsource = App.panels.forceDirected.clusters.filter(l => l.source === popped.source);
   var foundtarget = App.panels.forceDirected.clusters.filter(l => l.source === popped.target);
   if(foundsource.length!=0 && foundtarget.length!=0) {
    return 3;
  }
  else if (foundtarget.length!=0) {
    return 2;
  }
  else if (foundsource.length!=0) {
    return 1;
  }
  else {
    return 0;
  }
 }

  /*
  Creates an array with the name of the source and what cluster is belongs to
  Inputs: positive and negative flux thresholds
   */
  function defineClusters(nthreshold, pthreshold) {
    App.panels.forceDirected.clusters = [];
    var count = 1;
    var ppopped = App.panels.forceDirected.pclusterNodes.pop();
    var npopped = App.panels.forceDirected.nclusterNodes.pop();

    // positive clusters
    while(ppopped!=null && (ppopped.value > pthreshold))
    {
      
      // already in a cluster
      if(checkFound(ppopped))
      {
        //App.panels.forceDirected.clusters.push({source: ppopped.source, found[0].cluster});
        ppopped = App.panels.forceDirected.pclusterNodes.pop();
      }
      // hasn't been clustered
      else {
        App.panels.forceDirected.clusters.push({source: ppopped.source, cluster: count});
        ppopped = App.panels.forceDirected.pclusterNodes.pop();
        console.log(ppopped.value);
          App.panels.forceDirected.clusters.push({source: ppopped.source, cluster: count++});
          ppopped = App.panels.forceDirected.pclusterNodes.pop();
          console.log(ppopped.value);
      }  
    }

    // negative clusters
    while(npopped!=null && (npopped.value < nthreshold))
    {
      if(checkFound(npopped))
      {
        //App.panels.forceDirected.clusters.push({source: npopped.source, target: npopped.target, cluster: found[0].cluster});
        npopped = App.panels.forceDirected.nclusterNodes.pop();
      }
      else
      {
        App.panels.forceDirected.clusters.push({source: npopped.source, cluster: count});
        npopped = App.panels.forceDirected.nclusterNodes.pop();
        console.log(npopped.value);
          App.panels.forceDirected.clusters.push({source: npopped.source, cluster: count++});
          npopped = App.panels.forceDirected.nclusterNodes.pop();
        console.log(npopped.value);
        }
      }  
  }
}


