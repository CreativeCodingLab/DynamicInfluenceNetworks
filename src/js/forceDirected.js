var App = App || {};

function createForceDirectedGraph() {

  var _isDragging = false;
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
    .style("fill", "#eee");

  // define color gradients
  (function() {
      var defs = svg.append('defs');
      var red = defs.append('linearGradient')
          .attr('id','redLeft')
          .attr('x1',1)
          .attr('y1',0)
          .attr('x2',0)
          .attr('y2',0)
      red.append('stop')
          .attr('offset','0%')
          .attr('stop-color','gold');
      red.append('stop')
          .attr('offset','100%')
          .attr('stop-color', "#e31a1c");

      var green = defs.append('linearGradient')
          .attr('id','greenLeft')
          .attr('x1',1)
          .attr('y1',0)
          .attr('x2',0)
          .attr('y2',0)
      green.append('stop')
          .attr('offset','0%')
          .attr('stop-color','aquamarine');
      green.append('stop')
          .attr('offset','100%')
          .attr('stop-color',"#33a02c");
  
      defs.append('linearGradient')
          .attr('id','redRight')
          .attr('xlink:href','#redLeft')
          .attr('x1',0)
          .attr('x2',1)
      defs.append('linearGradient')
          .attr('id','redUp')
          .attr('xlink:href','#redLeft')
          .attr('x1',0)
          .attr('y1',1)
      defs.append('linearGradient')
          .attr('id','redDown')
          .attr('xlink:href','#redLeft')
          .attr('x1',0)
          .attr('y2',1)
      defs.append('linearGradient')
          .attr('id','greenRight')
          .attr('xlink:href','#greenLeft')
          .attr('x1',0)
          .attr('x2',1)
      defs.append('linearGradient')
          .attr('id','greenUp')
          .attr('xlink:href','#greenLeft')
          .attr('x1',0)
          .attr('y1',1)
      defs.append('linearGradient')
          .attr('id','greenDown')
          .attr('xlink:href','#greenLeft')
          .attr('x1',0)
          .attr('y2',1)
    })();

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
          var value = svg.sci ?
            Number(d.value.toPrecision(3)).toExponential() : 
            d.value.toFixed(3); 
          if (d.value < 0) { 
            return d.source.name + " infl.<br>" + "on " + d.target.name + "<br><span style='color:#e31a1c;'>" + value + "</span>";
          } else {
            return d.source.name + " infl.<br>" + "on " + d.target.name + "<br><span style='color:#33a02c;'>" + value + "</span>";
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
      inf: App.data[key].inf.filter(l => l.flux !== 0),
      outf: App.data[key].outf.filter(l => l.flux !== 0)
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

  var threshold = 5;
  defineClusters(threshold);

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
  }

  // draw nodes in graph
  function drawNodes(filteredData, width, height) {
    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(filteredData), (d) => {
        return filteredData[d].hits;
      }))
      .range([5, 10]);

    for (var key in filteredData) {
      filteredData[key].radius = radiusScale(filteredData[key].hits);
      filteredData[key].x = width / 2;
      filteredData[key].y = height / 2; 
    }

    App.panels.forceDirected.clusterObj = {};

    App.panels.forceDirected.clusters.forEach(cluster => {
      cluster.forEach(el => {
        App.panels.forceDirected.clusterObj[el.name] = el.cluster;
      });
    });
    var clusterNumArr = Array.apply(null, {length: 20}).map(Number.call, Number)

    var clusterColor = App.panels.forceDirected.clusterColor = d3.scaleOrdinal(d3.schemeCategory20)
      .domain(clusterNumArr[0]+1, clusterNumArr[1]+1);

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
      .attr("r", d => d.radius)
      // .style("fill", "#abd9e9")
      .style("fill", (d) => {
        return clusterColor(App.panels.forceDirected.clusterObj[d.name]);
      })
      .style("stroke", "#2c7bb6")
      .style("stroke-width", 1)
      .on('mouseover', _isDragging ? null : node_tip.show)
      .on("mouseout", node_tip.hide)
      .on('click', function(d) {
        d3.select(this)
          // .style("fill", "#abd9e9")
          .style("fill", (d) => {
            return clusterColor(App.panels.forceDirected.clusterObj[d.name]);
          })
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
            _isDragging = true;
            d3.select(this)
              .style("fill", (d) => {
                return clusterColor(App.panels.forceDirected.clusterObj[d.name]);
              })
              .style("stroke", "#404040");
            d.fx = d3.event.x, 
            d.fy = d3.event.y;
          })
          .on('end', function(d) {
            _isDragging = false;
            if (!d3.event.active) {
              simulation.alphaTarget(0);
            }
          }) );

  }

  var maxInfl;
  
  // draw links in graph
  function drawLinks(filteredData, width) {
    var sortedInfl = App.panels.forceDirected.links.sort((a, b) => {
      return Math.abs(b.value) - Math.abs(a.value);
    });

    maxInfl = Math.abs(sortedInfl[Math.round(sortedInfl.length/2)].value) * 2;

    var strokeScale = d3.scalePow()
      .domain([0, maxInfl])
      .range([0.3, sortedInfl.length > 200 ? 1 : 3])
      .clamp(true);

    var linkGroupElement = linkGroup.selectAll(".linkElement")
      .data(App.panels.forceDirected.links)
    .enter().append("g")
      .attr('class', 'linkElement')
      .attr('fill','none');

    // main line
    linkGroupElement.append('path')
      .attr("class", "link link-1")
      .style("stroke-width", (d) => {
        return strokeScale(Math.abs(d.value));
      });

    // invisible line for collisions
    linkGroupElement.append('path')
      .attr("class", "link link-2")
      .style("stroke-opacity", 0)
      .style("stroke-width", 8)
      .on("mouseover", (d, i) => {
        if (_isDragging) return;

        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y;
        var ex = event.x - d.target.x + 20,
            ey = event.y - d.target.y;

        d3.select(event.target)
          .style('stroke-opacity',0.5);

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
          .style('stroke-opacity',0);
        link_tip.hide(d,i);
      });
  }



  function createForceLayout() {
    var data = App.panels.forceDirected.filteredData;

    var nodeArr = Object.keys(data).map(n => App.panels.forceDirected.filteredData[n]);

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
      )
      .force("collision", d3.forceCollide(15))
      .force("charge", d3.forceManyBody()
        .strength(-150)
        .distanceMax(Math.min(width,height)/4))
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
          .style("stroke", (d) => {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y;
                // return 'black';
            if (d.value > 0) {
              if (Math.abs(dy/dx) > 3) {
                return dy >= 0 ? "url(#greenUp)" : "url(#greenDown)";
              }
              return dx >= 0 ? "url(#greenLeft)" : "url(#greenRight)";
            }
            else {
              if (Math.abs(dy/dx) > 3) {
                return dy >= 0 ? "url(#redUp)" : "url(#redDown)";
              }
              return dx >= 0 ? "url(#redLeft)" : "url(#redRight)";
            }
          })
          .attr('d', function(d) {
            var target = d.source,
                source = d.target;

            var dx = target.x - source.x,
                dy = target.y - source.y,
                dr = Math.sqrt(dx * dx + dy * dy)*2;

            if (dr == 0) { return ""; }

            var nx = -dx / dr,
                ny = -dy / dr;

            if (dr < 100) { dr /= 2; }

            var t = {
              x: target.x + (target.radius+3)*nx, 
              y: target.y + (target.radius+3)*ny
            };

            if (this.classList.contains('link-1')) {
              return  "M" + source.x + "," + source.y + 
                      "A" + dr + "," + dr + " 0 0,1 " + 
                      t.x + "," + t.y;
            }
            else {
              nx *= 8, ny *= 8;
              t.x += nx, t.y += ny;

              return  "M" + source.x + "," + source.y + 
                    "A" + dr + "," + dr + " 0 0,1 " + 
                    t.x + "," + t.y+
                    "m" + (2*nx-ny) + ',' + (2*ny+nx) + 
                    "L" + t.x + "," + t.y+
                    "l" + (2*nx+ny) + ',' + (2*ny-nx);
            }
          });      
        });

    simulation.force("link")
        .links(App.panels.forceDirected.links)
        .distance((d) => {

          let strengthScale = d3.scaleLinear()
            .domain([0, maxInfl])
            .range([1,0.4])
            .clamp(true);

          if (d.value < 0) {
            return 25/strengthScale(-d.value);
          }
          else {
            return 25*strengthScale(d.value);
          }
        })
        .strength((d) => {
          // console.log(d)
          let strengthScale = d3.scaleLinear()
            .domain([0, maxInfl])
            .range([0.3,1])
            .clamp(true);

          var multiplier = strengthScale(/*Math.abs*/(d.value));

          var cs = d.source.inf.length + d.source.outf.length,
              ct = d.target.inf.length + d.target.outf.length;
          return multiplier/Math.max(1,Math.min(cs, ct));
        });

        simulation.force("cluster", clustering)
                  .force("collide", collide);

        // Initial clustering forces:
        function clustering(alpha) {
            var clusters = App.panels.forceDirected.clusters;
            nodeArr.forEach(function(d) {
              if (d.cluster > 0) {
                var cluster = clusters[d.cluster][0];
                if (cluster === d) return;
                var x = d.x - cluster.x,
                    y = d.y - cluster.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + cluster.radius;
                if (x === 0 && y === 0 || (isNaN(x) || isNaN(y))) return;
                if (l !== r) {
                  l = (l - r) / l * alpha;
                  d.x -= x *= l;
                  d.y -= y *= l;
                  cluster.x += x;
                  cluster.y += y;
                }
              }
            });
        }

      function collide(alpha) {                                                            
        var padding = 1.5;
        var clusterPadding = 6; // separation between different-color circles
        var maxRadius = 20;
        var quadtree = d3.quadtree()
            .x((d) => d.x)
            .y((d) => d.y)
            .addAll(nodeArr);

        nodeArr.forEach(function(d) {
          var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
              nx1 = d.x - r,
              nx2 = d.x + r,
              ny1 = d.y - r,
              ny2 = d.y + r;
          quadtree.visit(function(quad, x1, y1, x2, y2) {

            if (quad.data && (quad.data !== d)) {
              var x = d.x - quad.data.x,
                  y = d.y - quad.data.y,
                  l = Math.sqrt(x * x + y * y),
                  r = d.r + quad.data.radius + (d.cluster === quad.data.cluster ? padding : clusterPadding);
              if (l < r) {
                l = (l - r) / l * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                quad.data.x += x;
                quad.data.y += y;
              }
            }
            return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
          });
        });
      }
  }// end createForceLayout

  // cluster
  function defineClusters (pthreshold, nthreshold) {
    if (nthreshold == undefined) { 
      pthreshold = Math.abs(pthreshold);
      nthreshold = -pthreshold; 
    }
    var clusters = [];
    var data = App.panels.forceDirected.filteredData;

    // clear clusters
    App.panels.forceDirected.links.forEach(l => {
      data[l.source].cluster = data[l.target].cluster = undefined
    });

    App.panels.forceDirected.links.forEach(link => {
      if (link.value >= pthreshold || link.value <= nthreshold) {
        var source = data[link.source],
            target = data[link.target],
            sc = source.cluster,
            tc = target.cluster;

        // create a new cluster
        if (sc == undefined && tc == undefined) {
          source.cluster = target.cluster = clusters.length;
          clusters.push([source, target])
        }
        // already in a cluster
        else if (sc !== tc) {
          if (sc == undefined) {
            source.cluster = tc;
            if (clusters[tc].indexOf(source) < 0) clusters[tc].push(source);
          }
          else if (tc == undefined) {
            target.cluster = sc;
            if (clusters[sc].indexOf(target) < 0) clusters[sc].push(target);
          }
          else {
            // join source cluster to target cluster
            clusters[tc].forEach(n => n.cluster = sc);
            clusters[sc] = clusters[sc].concat(clusters[tc]);
            clusters[tc] = [];
          }
        }
      }
    });

    // filter out null clusters & re-index
    clusters = [[]].concat(clusters.filter(cluster => cluster.length > 0));
    for (var n in data) {
      if (data[n].cluster == undefined) {
        clusters[0].push(data[n]);
      }
    }
    clusters.forEach((cluster,i) => {
        cluster.forEach(n => {
          n.cluster = i;
        });
        cluster.sort((a,b) => b.hits - a.hits);
      });
    App.panels.forceDirected.clusters = clusters;
  };

}