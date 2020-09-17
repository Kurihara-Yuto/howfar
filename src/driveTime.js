const createCircle = require("@turf/circle").default;
const transformRotate = require("@turf/transform-rotate").default;
const explode = require("@turf/explode").default;
const pointGrid = require("@turf/point-grid").default;
const bbox = require("@turf/bbox").default;
const tin = require("@turf/tin").default;
const turfTag = require("@turf/tag").default;
const turfLength = require("@turf/length").default;
const { lineString } = require("@turf/helpers");
const isobands = require("@turf/isobands").default;
const planepoint = require("@turf/planepoint").default;

/** Generate a range of numbers [start, end] */
const range = (start, end) =>
  Array(end - start + 1)
    .fill()
    .map((_, idx) => start + idx);

/**
 * @source https://medium.com/geolytix/creating-isochrone-catchments-from-a-distance-matrix-15f39e436d09
 * - origin coordinates as [lon, lat]
 * - OSRM service that supports the table function
 * - max distance of travel in seconds @default 3600
 * - Reach in km is the assumed maximum distance to reach from the origin @default 30 km
 * - Each detail level adds 24 sample points to the query, and there will be detail * 2 number of rings @default 3
 * - The number of isobands to generate, @default 1
 */
const driveTime = async (
  coordinates,
  osrm,
  distance = 3600,
  reach = 30,
  detail = 3,
  bands = 3
) => {
  // The origin of the catchment.
  const [lng, lat] = coordinates;

  const data = {
    circlePoints: [],
  };

  // Create sample points from circles.
  for (let i = 1; i <= detail * 2; i++) {
    let circle = createCircle(
      [lng, lat],
      ((10 * Math.pow(i, 3)) / (10 * Math.pow(detail * 2, 3))) * reach,
      {
        units: "kilometers",
        steps: 12,
      }
    );

    // Rotate alternate circles.
    if (i % 2 === 0)
      circle = transformRotate(circle, 15, {
        pivot: [lng, lat],
      });

    data.circlePoints = data.circlePoints.concat(
      explode(circle).features.slice(1)
    );
  }

  // Deep clone the circlePoints as samplePoints.
  data.samplePoints = JSON.parse(JSON.stringify(data.circlePoints));

  // Create destinations array from samplePoints.
  let destinations = data.samplePoints.map((pt) => [
    parseFloat(pt.geometry.coordinates[0].toFixed(6)),
    parseFloat(pt.geometry.coordinates[1].toFixed(6)),
  ]);

  const jbody = await osrm
    .table({
      sources: [0],
      coordinates: [coordinates].concat(destinations),
      generate_hints: false,
    })
    .catch(console.error);

  // Assign the results to the samplePoints.
  for (let i = 0; i < destinations.length; i++) {
    // Assign duration as property v.
    data.samplePoints[i].properties = {
      v: jbody.durations[0][i + 1],
    };

    let displacement = turfLength(
      lineString([
        [destinations[i][0], destinations[i][1]],
        [
          jbody.destinations[i + 1].location[0],
          jbody.destinations[i + 1].location[1],
          // data.samplePoints[i].geometry.coordinates[0],
          // data.samplePoints[i].geometry.coordinates[1],
        ],
      ]),
      {
        units: "kilometers",
      }
    );

    if (displacement > 1) {
      data.samplePoints[i].properties.outlier = true;
    }
  }

  function drivetime_calc() {
    // Filter outlier from samplePoints
    data.samplePoints = data.samplePoints.filter(
      (pt) => pt.properties.outlier !== true
    );

    // Filter outlier from samplePoints
    data.samplePoints = data.samplePoints.filter((pt) => {
      return pt.properties.v > 0;
    });

    // Create a pointgrid on the extent of the tin convex hull
    let pg = pointGrid(
      bbox({
        type: "FeatureCollection",
        features: data.samplePoints,
      }),
      Math.max(0.1, reach / 25),
      {
        units: "kilometers",
      }
    );

    // Create TIN
    data.tin = tin(
      {
        type: "FeatureCollection",
        features: data.samplePoints,
      },
      "v"
    );

    // Assign tin feature IDs
    for (let i = 0; i < data.tin.features.length; i++) {
      data.tin.features[i].properties.id = i;
    }

    // Tag the pointgrid points with the tin id
    let tag = turfTag(pg, data.tin, "id", "tin");

    // Assign interpolated drivetime values v from the tin element with matching tag ID
    tag.features.map(
      (pt) =>
        (pt.properties.v = pt.properties.tin
          ? planepoint(pt, data.tin.features[pt.properties.tin])
          : distance * 2)
    );

    const b = range(0, bands).map((x) => parseInt((x * distance) / bands));

    // Create ISO bands on the point grid
    data.iso = isobands(tag, b, { zProperty: "v" });

    return data;
  }

  return drivetime_calc();

  // return getOsrmDataAndProcessResults(0, destinations);
};

module.exports = driveTime;
