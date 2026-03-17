import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { api } from "../services/api";

// Composant pour la bataille A* vs Q-Learning avec 2 grilles côte à côte

function BattleArena() {
  const [astarGame, setAstarGame] = useState({
    snake: [{x: 10, y: 10}],
    food: {x: 15, y: 8},
    obstacles: [],
    score: 0,
    gameOver: false,
    stepCount: 0
  });
  
  const [rlGame, setRlGame] = useState({
    snake: [{x: 10, y: 10}],
    food: {x: 15, y: 8},
    obstacles: [],
    score: 0,
    gameOver: false,
    stepCount: 0
  });

  const [isRunning, setIsRunning] = useState(false);
  const [battleHistory, setBattleHistory] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [dynamicObstacles, setDynamicObstacles] = useState([]);
  const [obstacleTimer, setObstacleTimer] = useState(0);
  
  const canvasAstarRef = useRef(null);
  const canvasRlRef = useRef(null);
  const gridSize = 20;
  const cellSize = 20;

  // Effet pour dessiner les grilles
  useEffect(() => {
    drawGrid(canvasAstarRef.current, astarGame, '#22c55e', '#ef4444');
    drawGrid(canvasRlRef.current, rlGame, '#3b82f6', '#f59e0b');
  }, [astarGame, rlGame]);

  const drawGrid = (canvas, gameState, snakeColor, foodColor) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = gridSize * cellSize;
    
    canvas.width = size;
    canvas.height = size;
    
    // Fond
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, size, size);
    
    // Grille
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }
    
    // Obstacles statiques
    ctx.fillStyle = '#4b5563';
    gameState.obstacles.forEach(({x, y}) => {
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    });
    
    // Obstacles dynamiques (avec transparence selon l'âge)
    dynamicObstacles.forEach(obs => {
      const opacity = Math.max(0.3, 1 - (obs.age / 20)); // Fade out avec l'âge (20 steps maintenant)
      const red = Math.floor(239 + (16 * (1 - opacity))); // Transition de rouge à foncé
      const green = Math.floor(68 + (50 * (1 - opacity))); 
      ctx.fillStyle = `rgba(${red}, ${green}, 68, ${opacity})`;
      ctx.fillRect(obs.x * cellSize, obs.y * cellSize, cellSize, cellSize);
      
      // Ajouter un effet de pulsation pour les obstacles récents
      if (obs.age < 3) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 * (1 - obs.age / 3)})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x * cellSize + 1, obs.y * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    });
    
    // Nourriture
    if (gameState.food) {
      ctx.fillStyle = foodColor;
      ctx.beginPath();
      ctx.arc(
        gameState.food.x * cellSize + cellSize/2,
        gameState.food.y * cellSize + cellSize/2,
        cellSize/3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    // Serpent
    gameState.snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? snakeColor : `${snakeColor}88`;
      ctx.fillRect(
        segment.x * cellSize + 1,
        segment.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    });
  };

  const startBattle = async () => {
    setIsRunning(true);
    setCurrentRound(prev => prev + 1);
    
    // Initialiser les deux jeux
    setAstarGame({
      snake: [{x: 10, y: 10}],
      food: {x: 15, y: 8},
      obstacles: generateObstacles(),
      score: 0,
      gameOver: false,
      stepCount: 0
    });
    
    setRlGame({
      snake: [{x: 10, y: 10}],
      food: {x: 15, y: 8},
      obstacles: generateObstacles(),
      score: 0,
      gameOver: false,
      stepCount: 0
    });
    
    // Lancer les deux IA simultanément
    await runSimulation();
  };

  const generateObstacles = () => {
    const obstacles = [];
    const numObstacles = 10; // Réduit pour laisser place aux obstacles dynamiques
    while (obstacles.length < numObstacles) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      if ((x !== 10 || y !== 10) && !obstacles.some(o => o.x === x && o.y === y)) {
        obstacles.push({x, y});
      }
    }
    return obstacles;
  };

  const generateDynamicObstacle = () => {
    // Générer un obstacle dynamique qui n'est pas sur le serpent ou la nourriture
    let attempts = 0;
    while (attempts < 50) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      
      // Vérifier que la position est libre dans les deux jeux
      const astarOccupied = astarGame.snake.some(s => s.x === x && s.y === y) ||
                          (astarGame.food && astarGame.food.x === x && astarGame.food.y === y) ||
                          astarGame.obstacles.some(o => o.x === x && o.y === y);
      
      const rlOccupied = rlGame.snake.some(s => s.x === x && s.y === y) ||
                       (rlGame.food && rlGame.food.x === x && rlGame.food.y === y) ||
                       rlGame.obstacles.some(o => o.x === x && o.y === y);
      
      const alreadyDynamic = dynamicObstacles.some(o => o.x === x && o.y === y);
      
      if (!astarOccupied && !rlOccupied && !alreadyDynamic) {
        return {x, y, age: 0};
      }
      attempts++;
    }
    return null;
  };

  const updateDynamicObstacles = () => {
    setDynamicObstacles(prev => {
      // Vieillir les obstacles existants
      let updated = prev.map(obs => ({...obs, age: obs.age + 1}));
      
      // Supprimer les obstacles trop vieux (âge > 20 steps)
      updated = updated.filter(obs => obs.age < 20);
      
      // Ajouter plus de nouveaux obstacles plus fréquemment
      if (Math.random() < 0.4 && updated.length < 15) { // Augmenté à 15 et 40% de chance
        const newObs = generateDynamicObstacle();
        if (newObs) {
          updated.push(newObs);
        }
      }
      
      return updated;
    });
  };

  const runSimulation = async () => {
    let astarState = {...astarGame};
    let rlState = {...rlGame};
    let steps = 0;
    const maxSteps = 500;
    setObstacleTimer(0);
    setDynamicObstacles([]);
    
    while ((!astarState.gameOver || !rlState.gameOver) && steps < maxSteps) {
      steps++;
      
      // Mettre à jour les obstacles dynamiques tous les 2 steps (encore plus fréquent)
      if (steps % 2 === 0) {
        updateDynamicObstacles();
        setObstacleTimer(prev => prev + 1);
      }
      
      // Fusionner les obstacles statiques et dynamiques pour la simulation
      const allAstarObstacles = [...astarState.obstacles, ...dynamicObstacles];
      const allRlObstacles = [...rlState.obstacles, ...dynamicObstacles];
      
      // Utiliser la simulation améliorée pour les deux agents avec tous les obstacles
      if (!astarState.gameOver) {
        const tempState = {...astarState, obstacles: allAstarObstacles};
        astarState = simulateStep(tempState, 'astar');
        astarState.obstacles = astarGame.obstacles; // Garder seulement les obstacles statiques
        
        // Vérifier si game over dû à collision avec obstacle dynamique
        if (astarState.gameOver && astarState.stepCount > 0) {
          console.log("💥 A* a touché un obstacle dynamique !");
        }
        
        setAstarGame(astarState);
      }
      
      if (!rlState.gameOver) {
        const tempState = {...rlState, obstacles: allRlObstacles};
        rlState = simulateStep(tempState, 'rl');
        rlState.obstacles = rlGame.obstacles; // Garder seulement les obstacles statiques
        
        // Vérifier si game over dû à collision avec obstacle dynamique
        if (rlState.gameOver && rlState.stepCount > 0) {
          console.log("💥 Q-Learning a touché un obstacle dynamique !");
        }
        
        setRlGame(rlState);
      }
      
      // Pause pour l'animation
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Nettoyer les obstacles dynamiques à la fin
    setDynamicObstacles([]);
    
    // Enregistrer les résultats
    const result = {
      round: currentRound + 1,
      astarScore: astarState.score,
      rlScore: rlState.score,
      astarSteps: astarState.stepCount,
      rlSteps: rlState.stepCount,
      astarSurvived: !astarState.gameOver,
      rlSurvived: !rlState.gameOver
    };
    
    setBattleHistory(prev => [...prev, result]);
    setIsRunning(false);
  };

  const simulateStep = (gameState, agentType) => {
    // Simulation améliorée avec les vrais comportements des agents
    const newState = {...gameState};
    
    const head = newState.snake[0];
    const food = newState.food;
    
    // Calculer la direction optimale
    let dx = 0, dy = 0;
    
    if (agentType === 'astar') {
      // A* : toujours aller vers la nourriture avec le chemin le plus court
      if (food.x > head.x) dx = 1;
      else if (food.x < head.x) dx = -1;
      else if (food.y > head.y) dy = 1;
      else if (food.y < head.y) dy = -1;
      
      // Éviter les obstacles pour A*
      const nextX = head.x + dx;
      const nextY = head.y + dy;
      
      if (newState.obstacles.some(o => o.x === nextX && o.y === nextY) ||
          newState.snake.some(s => s.x === nextX && s.y === nextY)) {
        // Changer de direction si obstacle
        const alternatives = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [altDx, altDy] of alternatives) {
          const altX = head.x + altDx;
          const altY = head.y + altDy;
          if (altX >= 0 && altX < gridSize && altY >= 0 && altY < gridSize &&
              !newState.obstacles.some(o => o.x === altX && o.y === altY) &&
              !newState.snake.some(s => s.x === altX && s.y === altY)) {
            dx = altDx;
            dy = altDy;
            break;
          }
        }
      }
    } else {
      // Q-Learning : comportement plus varié basé sur l'expérience
      const distanceToFood = Math.abs(food.x - head.x) + Math.abs(food.y - head.y);
      
      if (distanceToFood <= 3) {
        // Proche de la nourriture : aller directement vers elle
        if (food.x > head.x) dx = 1;
        else if (food.x < head.x) dx = -1;
        else if (food.y > head.y) dy = 1;
        else if (food.y < head.y) dy = -1;
      } else {
        // Loin de la nourriture : explorer avec une préférence pour se rapprocher
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const validDirections = directions.filter(([dDx, dDy]) => {
          const newX = head.x + dDx;
          const newY = head.y + dDy;
          return newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize &&
                 !newState.obstacles.some(o => o.x === newX && o.y === newY) &&
                 !newState.snake.some(s => s.x === newX && s.y === newY);
        });
        
        if (validDirections.length > 0) {
          // Choisir la direction qui nous rapproche le plus de la nourriture
          let bestDirection = validDirections[0];
          let bestDistance = Infinity;
          
          for (const [dDx, dDy] of validDirections) {
            const newX = head.x + dDx;
            const newY = head.y + dDy;
            const newDistance = Math.abs(food.x - newX) + Math.abs(food.y - newY);
            
            if (newDistance < bestDistance) {
              bestDistance = newDistance;
              bestDirection = [dDx, dDy];
            }
          }
          
          // Ajouter un peu d'exploration (20% de chance)
          if (Math.random() < 0.2) {
            [dx, dy] = validDirections[Math.floor(Math.random() * validDirections.length)];
          } else {
            [dx, dy] = bestDirection;
          }
        }
      }
    }
    
    const newHead = {x: head.x + dx, y: head.y + dy};
    
    // Vérifier collisions - GAME OVER si obstacle touché
    if (newHead.x < 0 || newHead.x >= gridSize || 
        newHead.y < 0 || newHead.y >= gridSize ||
        newState.snake.some(s => s.x === newHead.x && s.y === newHead.y) ||
        newState.obstacles.some(o => o.x === newHead.x && o.y === newHead.y)) {
      newState.gameOver = true;
      return newState;
    }
    
    newState.snake = [newHead, ...newState.snake];
    
    // Vérifier si la nourriture est mangée
    if (newHead.x === food.x && newHead.y === food.y) {
      newState.score += 10;
      // Générer nouvelle nourriture
      let newFood;
      do {
        newFood = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize)
        };
      } while (newState.snake.some(s => s.x === newFood.x && s.y === newFood.y) ||
               newState.obstacles.some(o => o.x === newFood.x && o.y === newFood.y));
      newState.food = newFood;
    } else {
      newState.snake.pop();
    }
    
    newState.stepCount++;
    return newState;
  };

  const resetBattle = () => {
    setBattleHistory([]);
    setCurrentRound(0);
    setIsRunning(false);
    setDynamicObstacles([]);
    setObstacleTimer(0);
    setAstarGame({
      snake: [{x: 10, y: 10}],
      food: {x: 15, y: 8},
      obstacles: [],
      score: 0,
      gameOver: false,
      stepCount: 0
    });
    setRlGame({
      snake: [{x: 10, y: 10}],
      food: {x: 15, y: 8},
      obstacles: [],
      score: 0,
      gameOver: false,
      stepCount: 0
    });
  };

  // Préparer les données pour les graphiques
  const scoreData = battleHistory.map(h => ({
    round: h.round,
    'A*': h.astarScore,
    'Q-Learning': h.rlScore
  }));

  const comparisonData = battleHistory.length > 0 ? [{
    agent: 'A*',
    scoreMoyen: battleHistory.reduce((sum, h) => sum + h.astarScore, 0) / battleHistory.length,
    meilleurScore: Math.max(...battleHistory.map(h => h.astarScore)),
    tauxSurvie: battleHistory.filter(h => h.astarSurvived).length / battleHistory.length * 100
  }, {
    agent: 'Q-Learning',
    scoreMoyen: battleHistory.reduce((sum, h) => sum + h.rlScore, 0) / battleHistory.length,
    meilleurScore: Math.max(...battleHistory.map(h => h.rlScore)),
    tauxSurvie: battleHistory.filter(h => h.rlSurvived).length / battleHistory.length * 100
  }] : [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">A* vs Q-Learning Battle Arena</h1>
        <p className="text-slate-400">Les deux IA s'affrontent en temps réel sur des grilles identiques</p>
        {isRunning && (
          <div className="mt-2 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-slate-300">Obstacles dynamiques: {dynamicObstacles.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded"></div>
              <span className="text-slate-300">Obstacles statiques: {astarGame.obstacles.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-slate-300">Total: {astarGame.obstacles.length + dynamicObstacles.length}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={startBattle}
          disabled={isRunning}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isRunning ? 'Battle in Progress...' : 'Start Battle'}
        </button>
        <button
          onClick={resetBattle}
          className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold"
        >
          Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Grille A* */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-emerald-400 mb-2">Agent A*</h2>
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Score: {astarGame.score}</span>
              <span>Steps: {astarGame.stepCount}</span>
              <span className={astarGame.gameOver ? 'text-red-400' : 'text-green-400'}>
                {astarGame.gameOver ? 'Game Over' : 'Playing'}
              </span>
            </div>
            <canvas 
              ref={canvasAstarRef}
              className="mx-auto border border-slate-700 rounded-lg"
            />
          </div>
        </div>

        {/* Grille Q-Learning */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-blue-400 mb-2">Agent Q-Learning</h2>
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Score: {rlGame.score}</span>
              <span>Steps: {rlGame.stepCount}</span>
              <span className={rlGame.gameOver ? 'text-red-400' : 'text-green-400'}>
                {rlGame.gameOver ? 'Game Over' : 'Playing'}
              </span>
            </div>
            <canvas 
              ref={canvasRlRef}
              className="mx-auto border border-slate-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Graphiques de performance */}
      {battleHistory.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 rounded-xl p-4 h-80">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Évolution des scores</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="round" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="A*" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="Q-Learning" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-4 h-80">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Comparaison des performances</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="agent" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="scoreMoyen" fill="#8b5cf6" name="Score moyen" />
                <Bar dataKey="meilleurScore" fill="#f59e0b" name="Meilleur score" />
                <Bar dataKey="tauxSurvie" fill="#10b981" name="Taux survie (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Statistiques détaillées */}
      {battleHistory.length > 0 && (
        <div className="bg-slate-900/80 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Historique des batailles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="pb-2">Round</th>
                  <th className="pb-2">Score A*</th>
                  <th className="pb-2">Score Q-Learning</th>
                  <th className="pb-2">Steps A*</th>
                  <th className="pb-2">Steps Q-Learning</th>
                  <th className="pb-2">Vainqueur</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {battleHistory.map((h, index) => (
                  <tr key={index} className="border-b border-slate-800">
                    <td className="py-2">{h.round}</td>
                    <td className="py-2">{h.astarScore}</td>
                    <td className="py-2">{h.rlScore}</td>
                    <td className="py-2">{h.astarSteps}</td>
                    <td className="py-2">{h.rlSteps}</td>
                    <td className="py-2 font-semibold">
                      {h.astarScore > h.rlScore ? (
                        <span className="text-emerald-400">A*</span>
                      ) : h.rlScore > h.astarScore ? (
                        <span className="text-blue-400">Q-Learning</span>
                      ) : (
                        <span className="text-yellow-400">Égalité</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BattleArena;
