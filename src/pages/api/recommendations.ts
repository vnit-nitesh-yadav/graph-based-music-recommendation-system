import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

type RecommendationData = {
  recommendations: string[]
  error?: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecommendationData>
) {
  const { song } = req.query
  
  if (!song || typeof song !== 'string') {
    return res.status(400).json({ 
      recommendations: [],
      error: 'Song name is required' 
    })
  }

  try {
    // Read the subgraph CSV file
    const csvPath = path.join(process.cwd(), 'public', 'subgraph.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    
    // Parse CSV with proper handling of quoted fields
    const records = parseCSV(fileContent)

    // Build bidirectional graph from CSV
    const graph: Record<string, Record<string, number>> = {}
    const reverseGraph: Record<string, Record<string, number>> = {} // For incoming edges
    const allSongs = new Set<string>()
    
    for (const record of records) {
      const source = record.source?.trim()
      const target = record.target?.trim()
      const value = parseFloat(record.value) || 0
      
      if (source && target && source !== target) {
        allSongs.add(source)
        allSongs.add(target)
        
        // Forward edges
        if (!graph[source]) {
          graph[source] = {}
        }
        graph[source][target] = Math.max(graph[source][target] || 0, value)
        
        // Reverse edges (bidirectional)
        if (!reverseGraph[target]) {
          reverseGraph[target] = {}
        }
        reverseGraph[target][source] = Math.max(reverseGraph[target][source] || 0, value)
      }
    }

    // Find song (case-insensitive)
    const searchSong = song.trim().toLowerCase()
    let foundSong = null
    
    for (const s of Array.from(allSongs)) {
      if (s.toLowerCase() === searchSong) {
        foundSong = s
        break
      }
    }

    if (!foundSong) {
      // Get suggestions
      const suggestions = Array.from(allSongs)
        .filter(s => !s.toLowerCase().includes('artist'))
        .slice(0, 5)
      
      return res.status(404).json({ 
        recommendations: suggestions,
        error: `Song "${song}" not found. Try clicking a song node directly on the graph. Available: ${suggestions.join(', ')}` 
      })
    }

    // Use forward graph if available, otherwise use reverse graph
    const graphToUse = graph[foundSong] ? graph : reverseGraph
    
    if (!graphToUse[foundSong]) {
      // Get suggestions
      const suggestions = Array.from(allSongs)
        .filter(s => !s.toLowerCase().includes('artist'))
        .slice(0, 5)
      
      return res.status(404).json({ 
        recommendations: suggestions,
        error: `No connections found for "${foundSong}". Try another song.` 
      })
    }

    // Perform random walk from the selected song
    const recommendations = randomWalk(graphToUse, foundSong, 500)
    
    // Get top recommendations, but with diversity-aware filtering
    let topRecommendations = recommendations
      .filter(([nodeName]) => nodeName.toLowerCase() !== foundSong.toLowerCase())
      .slice(0, 10) // Get top 10 first
      .map(([nodeName]) => nodeName)
    
    // Remove hub nodes (most commonly recommended) to increase diversity
    // Keep them but deprioritize them
    const frequentHubs = new Set(['Adelitas Way', 'Scream', 'Hate Love', 'Dirty Little Thing', "It's Not Over"])
    
    // Partition recommendations into hubs and others
    const hubRecs = topRecommendations.filter(r => frequentHubs.has(r))
    const otherRecs = topRecommendations.filter(r => !frequentHubs.has(r))
    
    // Prioritize non-hub recommendations, mix in some hubs
    const diverseRecs = [
      ...otherRecs.slice(0, 3),  // Get 3 diverse recommendations first
      ...hubRecs.slice(0, 2)      // Then add 2 hub nodes
    ].slice(0, 5)

    if (diverseRecs.length === 0) {
      // Fallback to top recommendations if no diverse ones found
      topRecommendations = recommendations
        .filter(([nodeName]) => nodeName.toLowerCase() !== foundSong.toLowerCase())
        .slice(0, 5)
        .map(([nodeName]) => nodeName)
    } else {
      topRecommendations = diverseRecs
    }

    if (topRecommendations.length === 0) {
      return res.status(404).json({ 
        recommendations: [],
        error: `No recommendations found for "${foundSong}"` 
      })
    }

    return res.status(200).json({ 
      recommendations: topRecommendations 
    })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return res.status(500).json({ 
      recommendations: [],
      error: `Error: ${error instanceof Error ? error.message : 'Internal server error'}` 
    })
  }
}

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split('\n')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const records: Array<Record<string, string>> = []

  let currentLine = ''
  for (let i = 1; i < lines.length; i++) {
    currentLine += (currentLine ? '\n' : '') + lines[i]

    // Count quotes to see if we have a complete line
    const quoteCount = (currentLine.match(/"/g) || []).length
    
    // If we have an even number of quotes, the line is complete
    if (quoteCount % 2 === 0 && currentLine.trim()) {
      const values = parseCSVLine(currentLine)
      if (values.length === headers.length) {
        const record: Record<string, string> = {}
        headers.forEach((header, idx) => {
          record[header.trim()] = values[idx] || ''
        })
        records.push(record)
        currentLine = ''
      }
    }
  }

  return records
}

function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result.map(v => v.replace(/^"|"$/g, '').trim())
}

function randomWalk(
  graph: Record<string, Record<string, number>>,
  startNode: string,
  numSteps: number
): [string, number][] {
  if (!graph[startNode]) {
    return []
  }

  let currentNode = startNode
  const similarityScores: Record<string, number> = {}
  
  // Initialize all nodes with 0 score
  for (const node in graph) {
    similarityScores[node] = 0
  }

  // Perform random walk
  for (let i = 0; i < numSteps; i++) {
    const neighbors = graph[currentNode]
    if (!neighbors || Object.keys(neighbors).length === 0) {
      // Dead end, restart from start node
      currentNode = startNode
      continue
    }

    // Calculate total weight
    const totalWeight = Object.values(neighbors).reduce((sum, w) => sum + w, 0)
    if (totalWeight === 0) continue
    
    // Create probability distribution
    const probabilities: number[] = []
    const nodes: string[] = []
    for (const [neighbor, weight] of Object.entries(neighbors)) {
      probabilities.push(weight / totalWeight)
      nodes.push(neighbor)
    }

    // Choose next node based on probabilities
    const random = Math.random()
    let cumulative = 0
    for (let j = 0; j < probabilities.length; j++) {
      cumulative += probabilities[j]
      if (random <= cumulative) {
        currentNode = nodes[j]
        break
      }
    }

    // Update similarity score for current node
    if (currentNode in similarityScores) {
      similarityScores[currentNode]++
    }
  }

  // Sort by similarity score
  const sorted = Object.entries(similarityScores)
    .sort((a, b) => b[1] - a[1])
    .map(([node, score]) => [node, score] as [string, number])

  return sorted
}
