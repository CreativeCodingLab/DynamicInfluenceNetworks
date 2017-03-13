const PaintingManager = function() {
  let self = {
    inPaintingMode: true,

    isPaintingCluster: false,
    currentClusterNumber: -1,
    paintedClusters: []
  };

  function startPaintingNewClsuter() {
    self.isPaintingCluster = true;
    self.currentClusterNumber++;

    self.paintedClusters.push([]);
  }

  function addNodeToPaintingCluster(node) {
    if (self.isPaintingCluster) {
      self.paintedClusters[self.currentClusterNumber].push(node);
    }
  }

  function stopPaintingCluster() {
    self.isPaintingCluster = false;
  }

  /* === GETTERS && SETTERS === */
  function setPaintingMode(isPainting) {
    self.inPaintingMode = isPainting;
  }

  function isInPaintingMode() {
    return self.inPaintingMode;
  }

  function isPaintingCluster() {
    return self.isPaintingCluster;
  }

  function getCurrentClusterNumber() {
    return self.currentClusterNumber;
  }

  function getPaintedClusters() {
    return self.paintedClusters;
  }

  return {
    startPaintingNewClsuter: startPaintingNewClsuter,
    addNodeToPaintingCluster: addNodeToPaintingCluster,
    stopPaintingCluster: stopPaintingCluster,
    // setters/getters
    setPaintingMode: setPaintingMode,
    isInPaintingMode: isInPaintingMode,

    isPaintingCluster: isPaintingCluster,

    getCurrentClusterNumber: getCurrentClusterNumber,

    getPaintedClusters: getPaintedClusters
  };
};
