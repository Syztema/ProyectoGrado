// src/utils/geoCheck.js

// Coordenadas del polígono
// export const polygonCoordinates = [
//     [-74.19225918835077, 4.62257642762421],
//     [-74.19225918835077, 4.619636811071459],
//     [-74.188251974454, 4.619636811071459],
//     [-74.188251974454, 4.62257642762421],
//     [-74.19225918835077, 4.62257642762421]
//   ];

export const polygonCoordinates = [
  [-74.1018816111137, 4.712213531694303],
  [-74.1018816111137, 4.706285005890166],
  [-74.09376481966154, 4.706285005890166],
  [-74.09376481966154, 4.712213531694303],
  [-74.1018816111137, 4.712213531694303],
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
