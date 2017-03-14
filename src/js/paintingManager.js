const PaintingManager = function(graph) {
  let self = {
    inPaintingMode: true,
    overrideExistingClusters: true,

    isPaintingCluster: false,
    currentClusterNumber: -1,
    paintedClusters: [],
  };

  function startPaintingNewCluster() {
    self.isPaintingCluster = true;

    // get rid of any empty clusters
    self.paintedClusters = _.filter(self.paintedClusters, el => el.length);
    self.currentClusterNumber = self.paintedClusters.length;

    self.paintedClusters.push([]);
  }

  function addNodeToPaintingCluster(node) {
    if (self.isPaintingCluster) {
      if (node.paintedCluster !== undefined) {
        _.remove(self.paintedClusters[node.paintedCluster], function(n) {
          return n.name === node.name;
        });
      }
      node.paintedCluster = self.currentClusterNumber;
      node.isPainted = true;

      self.paintedClusters[self.currentClusterNumber].push(node);
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

    self.currentClusterNumber = -1;

    self.paintedClusters = [];
    graph.defineClusters();
    graph.drawGraph();

    if (self.isPaintingCluster) {
      self.startPaintingNewCluster();
    }
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

  function getCurrentClusterNumber() {
    return self.currentClusterNumber;
  }

  function getPaintedClusters() {
    return self.paintedClusters;
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

    getCurrentClusterNumber: getCurrentClusterNumber,

    getPaintedClusters: getPaintedClusters
  };
};
