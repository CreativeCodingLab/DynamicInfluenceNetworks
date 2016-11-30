var App = App || {};

function ForceDirectedGraph(args) {
  Object.assign(this, args || ForceDirectedGraph.prototype)

  this.init();
  this.filterData(App.data);
  this.clusters = this.defineClusters(5); // hard coded??

  // set up simulation
  this.simulation = d3.forceSimulation()
    .force("link", 
      d3.forceLink()
        .id(d => d.name)
    )
    .force("collision", d3.forceCollide(15))
    .force("charge", d3.forceManyBody()
      .strength(-150)
      .distanceMax(Math.min(this.width, this.height)/4))
    .force("center", d3.forceCenter(
      (this.width / 2),
      (this.height / 2)
    ));

  // update graph
  this.drawGraph();
};

ForceDirectedGraph.prototype = {
  // set up svg elements
  init: function() {
    // allows all work to be done using same coordinates initially used
    // no need to redraw on resize
    this.svg.attr("viewBox", "0 0 " + this.width + " " + this.height);

    // background color
    this.svg.append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("padding", "20px")
      .style("fill", "#eee");
    
    // stroke gradients
    var defs = this.svg.append('defs');
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

    this.linkGroup = this.svg.append("g")
      .attr("class", "linkGroup");
    this.nodeGroup = this.svg.append("g")
      .attr("class", "nodeGroup");
    this._isDragging = false;

    /* Initialize tooltip for nodes */
    let node_tip = d3.tip ? d3.tip().attr('class', 'd3-tip')
      .html(function(d) {
        return "Rule: <span style='color:red;'>" + d.name + "</span>";
      }) :
      function() {
        alert("! d3.tip MISSING ! \nDo you have an internet connection?");
      };

    /* Initialize tooltip for links */
    var svg = this.svg;
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
    this.svg.call(node_tip);
    this.svg.call(link_tip);

    this.node_tip = node_tip;
    this.link_tip = link_tip;
  },

  // process data into nodes & links where links have magnitude > 0
  filterData: function(data) {
    var filteredData = {};
    var links = [];

    for (var key in data) {
      var newNode = {
        hits: data[key].hits,
        name: data[key].name,
        inf: data[key].inf.filter(l => l.flux !== 0),
        outf: data[key].outf.filter(l => l.flux !== 0)
      }

      newNode.inf.forEach(l => {
        links.push({
          source: key,
          target: l.name,
          value: l.flux
        });
      })

      if (newNode.inf.length > 0 || newNode.outf.length > 0) {
        filteredData[key] = newNode;
      }
    }

    this.filteredData = filteredData,
    this.links = links;
  },

  // cluster data based on threshold(s) of influence
  defineClusters: function(pthreshold, nthreshold) {
    if (nthreshold == undefined) { 
      pthreshold = Math.abs(pthreshold);
      nthreshold = -pthreshold; 
    }
    var clusters = [];
    var data = this.filteredData;

    // clear clusters
    this.links.forEach(l => {
      data[l.source].cluster = data[l.target].cluster = undefined
    });

    this.links.forEach(link => {
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
    return clusters;
  },

  // update function
  drawGraph: function() {
    this.drawNodes();
    this.drawLinks();
    this.createForceLayout();
  },

  // draw nodes
  drawNodes: function() {
    var filteredData = this.filteredData;
    var radiusScale = d3.scaleLinear()
      .domain(d3.extent(Object.keys(filteredData), (d) => {
        return filteredData[d].hits;
      }))
      .range([5, 10]);

    // scale nodes by # of hits
    for (var key in filteredData) {
      filteredData[key].radius = radiusScale(filteredData[key].hits);
      filteredData[key].x = this.width / 2;
      filteredData[key].y = this.height / 2; 
    }

    var self = this;
    this.nodeGroup.selectAll(".rule")
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
      .style("fill", (d) => this.clusterColor(d.cluster))
      .style("stroke", "white")
      .style("stroke-width", 2)
      .on('mouseover', this._isDragging ? null : this.node_tip.show)
      .on("mouseout", this.node_tip.hide)
      .on('click', function(d) {
        d3.select(this)
          .style("fill", (d) => self.clusterColor(d.cluster))
          .style("stroke", "white");

        d.fx = d.fy = null; 
      })
      .call( 
        d3.drag()
          .on('start', function(d) {
            if (!d3.event.active) {
              self.simulation.alphaTarget(0.3).restart();
            }
          })
          .on('drag', function(d) { 
            self._isDragging = true;
            d3.select(this)
              .style("fill", self.clusterColor(d.cluster))
              .style("stroke", "#404040");
            d.fx = d3.event.x, 
            d.fy = d3.event.y;
          })
          .on('end', function(d) {
            self._isDragging = false;
            if (!d3.event.active) {
              self.simulation.alphaTarget(0);
            }
          }) );
  },

  clusterColor: 
    d3.scaleOrdinal(d3.schemeCategory20)
      .domain(d3.range(1,20)),

  drawLinks: function() {
    var sortedInfl = App.panels.forceDirected.links.sort((a, b) => {
      return Math.abs(b.value) - Math.abs(a.value);
    });

    this.maxInfl = Math.abs(sortedInfl[Math.round(sortedInfl.length/2)].value) * 2;

    var strokeScale = d3.scalePow()
      .domain([0, this.maxInfl])
      .range([0.3, sortedInfl.length > 200 ? 1 : 3])
      .clamp(true);

    var linkGroupElement = this.linkGroup.selectAll(".linkElement")
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
    var self = this;
    linkGroupElement.append('path')
      .attr("class", "link link-2")
      .style("stroke-opacity", 0)
      .style("stroke-width", 8)
      .on("mouseover", (d, i) => {
        if (self._isDragging) return;
        d3.select(event.target)
          .style('stroke-opacity',0.5);
        self.link_tip.show(d,i);
      })
      .on("mouseout", (d, i) => {
        d3.select(event.target)
          .transition()
          .style('stroke-opacity',0);
        self.link_tip.hide(d,i);
      });
  },

  // the big workhorse of the simulation ???
  createForceLayout: function() {

    var data = this.filteredData,
        nodeArr = Object.keys(data).map(n => data[n]);

    var borderNodeMargin = 10;

    var clampX = d3.scaleLinear()
      .domain([16 + borderNodeMargin, this.width - 16 - borderNodeMargin])
      .range([16 + borderNodeMargin, this.width - 16 - borderNodeMargin])
      .clamp(true);

    var clampY = d3.scaleLinear()
      .domain([16 + borderNodeMargin, this.height - 16 - borderNodeMargin])
      .range([16 + borderNodeMargin, this.height - 16 - borderNodeMargin])
      .clamp(true);

    var self = this;
    this.simulation
      .nodes(nodeArr)
      .on("tick", tick);

    // modify the appearance of the nodes and links on tick
    var node = this.nodeGroup.selectAll(".rule");
    var link = this.linkGroup.selectAll(".link");
    function tick() {
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
          .attr('d', createArrowPath);
    }

    function createArrowPath(d) {
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
    }


    // simulation forces
    this.simulation.force("link")
        .links(App.panels.forceDirected.links)
        .distance((d) => {

          let strengthScale = d3.scaleLinear()
            .domain([0, self.maxInfl])
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
          let strengthScale = d3.scaleLinear()
            .domain([0, self.maxInfl])
            .range([0.3,1])
            .clamp(true);

          var multiplier = strengthScale(/*Math.abs*/(d.value));

          var cs = d.source.inf.length + d.source.outf.length,
              ct = d.target.inf.length + d.target.outf.length;
          return multiplier/Math.max(1,Math.min(cs, ct));
        });

    this.simulation.force("cluster", clustering)
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
  } // end createForceLayout
}
