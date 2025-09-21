// Test de la fonction generateSeededPositions

function generateSeededPositions(teams, size) {
  const positions = new Array(size).fill(null)

  // Placement standard des têtes de série (système tennis)
  const seedPlacements = {
    2: [0, 1],
    4: [0, 3, 1, 2],
    8: [0, 7, 3, 4, 1, 6, 2, 5],
    16: [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10],
    32: [0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20, 1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21]
  }

  const placements = seedPlacements[size] || []

  // Placer les équipes selon leur seed
  for (let i = 0; i < Math.min(teams.length, placements.length); i++) {
    positions[placements[i]] = teams[i].id
  }

  return positions
}

// Test avec nos 12 équipes
const teams = [
  { id: '799cdaba', name: 'Maingre/Bouraoui', seed_position: 1 },
  { id: '83039396', name: 'Ballochi/Mardirossian', seed_position: 2 },
  { id: 'b4402f75', name: 'Zeraia/Benziada', seed_position: 3 },
  { id: 'a5ce03ce', name: 'El Sayed/Doumia', seed_position: 4 },
  { id: '457b4b88', name: 'Gibilaro/Emile', seed_position: 5 },
  { id: 'a2b3e924', name: 'Scaduto/Huc', seed_position: 6 },
  { id: '6a78aa3f', name: 'Matthieu/Le Rider', seed_position: 7 },
  { id: '009c3dcf', name: 'Monster/Victime', seed_position: 8 },
  { id: '2f909c0a', name: 'Belzunce/Zafari', seed_position: 9 },
  { id: '4d292664', name: 'Llorens/Cance', seed_position: 10 },
  { id: '7fea49b8', name: 'Manger/Sombre', seed_position: 11 },
  { id: 'abcc4cd1', name: 'Lammens/PorteD\'Aix', seed_position: 12 }
]

console.log('🧪 Test generateSeededPositions...')
console.log(`Équipes: ${teams.length}, Taille bracket: 16`)

const positions = generateSeededPositions(teams, 16)

console.log('\n📊 Positions générées:')
for (let i = 0; i < positions.length; i++) {
  const teamId = positions[i]
  const team = teams.find(t => t.id === teamId)
  console.log(`Position ${i}: ${team ? team.name : 'BYE'} (${teamId?.slice(0,8) || 'null'})`)
}

console.log('\n🥊 Premier round (matchs):')
for (let i = 0; i < 8; i++) {
  const pos1 = i * 2
  const pos2 = i * 2 + 1
  const team1 = teams.find(t => t.id === positions[pos1])
  const team2 = teams.find(t => t.id === positions[pos2])

  console.log(`Match ${i+1}: ${team1?.name || 'BYE'} vs ${team2?.name || 'BYE'}`)
}