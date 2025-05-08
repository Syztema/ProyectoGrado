// src/utils/geoCheck.js

// Coordenadas del polígono
/*export const polygonCoordinates = [
    [-74.19225918835077, 4.62257642762421],
    [-74.19225918835077, 4.619636811071459],
    [-74.188251974454, 4.619636811071459],
    [-74.188251974454, 4.62257642762421],
    [-74.19225918835077, 4.62257642762421]
  ];*/

export const polygonCoordinates = [
  [-74.18760032408129, 4.6269245056253965],
  [-74.18760032408129, 4.62569857589007],
  [-74.18559010456853, 4.62569857589007],
  [-74.18559010456853, 4.6269245056253965],
  [-74.18760032408129, 4.6269245056253965],
];

// Función que verifica si un punto está dentro del polígono
export function isWithinArea(userLat, userLng) {
  const x = userLng;
  const y = userLat;

  let inside = false;
  for (
    let i = 0, j = polygonCoordinates.length - 1;
    i < polygonCoordinates.length;
    j = i++
  ) {
    const xi = polygonCoordinates[i][0],
      yi = polygonCoordinates[i][1];
    const xj = polygonCoordinates[j][0],
      yj = polygonCoordinates[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}
