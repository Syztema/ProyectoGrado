// src/utils/geoCheck.js

// Coordenadas del polígono
export const polygonCoordinates = [
  [-74.10214088213027, 4.7126672132800564],
  [-74.10214088213027, 4.704431793044321],
  [-74.09212611250302, 4.704431793044321],
  [-74.09212611250302, 4.7126672132800564],
  [-74.10214088213027, 4.7126672132800564],
];

// export const polygonCoordinates = [
//   [-74.18794369437381, 4.621631970532704],
//   [-74.18794369437381, 4.619219327197385],
//   [-74.18449965521741, 4.619219327197385],
//   [-74.18449965521741, 4.621631970532704],
//   [-74.18794369437381, 4.621631970532704],
// ];

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
