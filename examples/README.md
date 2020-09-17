# Quick introduction to the algorithm

Although the algorithm is described in more detail by [Geolytic](https://medium.com/geolytix/creating-isochrone-catchments-from-a-distance-matrix-15f39e436d09), 
I wanted to share here some intermediate results:

Starting from the initial coordinate and the transport profile (e.g. driving), estimate the maximum distance in km that can be reached.
Compute [circle points](https://github.com/erikvullings/howfar/blob/master/examples/circlePoints.geojson) (12 points per circle) and 2 rings for each level of detail.

Next, using the [OSRM table service](http://project-osrm.org/docs/v5.22.0/api/#table-service), compute which points you can actually reach
from the starting point in the given time, the [sample points](https://github.com/erikvullings/howfar/blob/master/examples/samplePoints.geojson).

Put the points in a [tin](https://github.com/erikvullings/howfar/blob/master/examples/tin.geojson), leading to the final
[result](https://github.com/erikvullings/howfar/blob/master/examples/driving.geojson).

