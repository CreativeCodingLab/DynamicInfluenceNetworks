const PaintingManager = function(graph) {
  let self = {
    inPaintingMode: true,
    overrideExistingClusters: true,

    isPaintingCluster: false,
    currentPaintingCluster: -1,
    paintedClusters: {},

    paintingColors: d3.schemeCategory20
  };

  function startPaintingNewCluster(clusterNumber) {
    self.isPaintingCluster = true;

    // get rid of any empty clusters
    self.paintedClusters = _.pickBy(self.paintedClusters, function(l) {
      return l.length > 0;
    });

    if (isNaN(clusterNumber)) {
      self.currentPaintingCluster = getColor(Object.keys(self.paintedClusters).length);

    }
    else {
      self.currentPaintingCluster = getColor(clusterNumber);
    }

    if (!self.paintedClusters[self.currentPaintingCluster]) {
      self.paintedClusters[self.currentPaintingCluster] = [];
    }
  }

  function addNodeToPaintingCluster(node) {
    if (self.isPaintingCluster) {
      if (node.paintedCluster !== undefined) {
        _.remove(self.paintedClusters[node.paintedCluster], function(n) {
          return n.name === node.name;
        });
      }
      node.paintedCluster = self.currentPaintingCluster;
      node.isPainted = true;

      console.log('adding node', node.paintedCluster, node);

      console.log(self.paintedClusters, self.currentPaintingCluster);

      self.paintedClusters[self.currentPaintingCluster].push(node);
      graph.defineClusters();
      graph.drawGraph();
    }
  }

  function stopPaintingCluster() {
    self.isPaintingCluster = false;
  }

  function unPaintAllNodes() {
    _.forEach(self.paintedClusters, function (cluster, i) {
      _.forEach(cluster, function(node) {
        delete node.paintedCluster;
        delete node.isPainted;
      });
    });

    self.currentPaintingCluster = -1;

    self.paintedClusters = [];
    graph.defineClusters();
    graph.drawGraph();

    if (self.isPaintingCluster) {
      startPaintingNewCluster();
    }
  }

  function getColor(index) {
    return self.paintingColors[index];
  }

  /* ========================= GETTERS && SETTERS =========================== */
  function setPaintingMode(isPainting) {
    self.inPaintingMode = isPainting;
  }

  function isInPaintingMode() {
    return self.inPaintingMode;
  }

  function isPaintingCluster() {
    return self.isPaintingCluster;
  }

  function setOverrideExistingClusters(override) {
    self.overrideExistingClusters = override;
  }

  function isOverridingExistingClusters() {
    return self.overrideExistingClusters;
  }

  function getCurrentPaintingCluster() {
    return self.currentPaintingCluster;
  }

  function getPaintedClusters() {
    return _.map(Object.keys(self.paintedClusters), function(color) {
      return self.paintedClusters[color];
    })
  }

  return {
    startPaintingNewCluster: startPaintingNewCluster,
    addNodeToPaintingCluster: addNodeToPaintingCluster,
    stopPaintingCluster: stopPaintingCluster,
    unPaintAllNodes: unPaintAllNodes,
    // setters/getters
    setPaintingMode: setPaintingMode,
    isInPaintingMode: isInPaintingMode,

    isPaintingCluster: isPaintingCluster,

    isOverridingExistingClusters: isOverridingExistingClusters,
    setOverrideExistingClusters: setOverrideExistingClusters,

    getCurrentPaintingCluster: getCurrentPaintingCluster,

    getPaintedClusters: getPaintedClusters
  };
};
