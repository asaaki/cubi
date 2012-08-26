Utils = {
  merge: function(obj1, obj2) {
    var obj3 = {}
      , attr = null

    for (attr in obj1) { obj3[attr] = obj1[attr] }
    for (attr in obj2) { obj3[attr] = obj2[attr] }

    return obj3
  },

  addObserverMethods: function(instance) {
    instance.listeners = {}
    instance.on = function(eventName, callback) {
      instance.listeners[eventName] = instance.listeners[eventName] || []
      instance.listeners[eventName].push(callback)
    }
    instance.off = function(eventName, callback) {
      instance.listeners[eventName] = instance.listeners[eventName].filter(function(cb) {
        return cb != callback
      })
    }
    instance.fire = function(eventName, data) {
      data = data || []
      data = (Array.isArray(data) ? data : [data]);

      (instance.listeners[eventName] || []).forEach(function(callback) {
        callback.apply(instance, data)
      })
    }
  },

  interpolate: function(s, replacements) {
    for(var key in replacements) {
      s = s.replace(new RegExp('%{' + key + '}', 'g'), replacements[key])
    }

    return s
  }
}

NodeList.prototype.forEach = Array.prototype.forEach
;
(function() {
  Grid = function(rows, cols, canvas) {
    this.rows      = rows
    this.cols      = cols
    this.canvas    = canvas
    this.container = document.createElement('table')
    this.path      = []
    this.cells     = []
  }

  Grid.prototype.render = function() {
    createDOM.call(this)

    this.path = createPath.call(this)

    this.path.forEach(function(cell) {
      cell.setType(GridCell.PATH)
    })
  }

  // private

  var createDOM = function() {
    var self = this

    for(var i = 0; i < this.rows; i++) {
      var tr    = document.createElement('tr')
        , cells = []

      for(var j = 0; j < this.cols; j++) {
        var cell = new GridCell(self)

        cells.push(cell)
        tr.appendChild(cell.getElement())
      }

      this.container.appendChild(tr)
      this.cells.push(cells)
    }

    this.canvas.appendChild(this.container)
  }

  var createPath = function() {
    var indexes = getPathCellIndexes.call(this)
      , cells   = []
      , self    = this

    indexes.forEach(function(col, x) {
      col.forEach(function(y) {
        var cell = getCell.call(self, x, y)
        cells.push(cell)
      })
    })

    return cells
  }

  var getPathCellIndexes = function() {
    var indexes      = []
      , lastWayPoint = null

    for(var colIndex = 0; colIndex < this.cols; colIndex++) {
      var cells = []
        , start = (lastWayPoint !== null) ? lastWayPoint : (~~(Math.random() * this.rows))
        , end   = ~~(Math.random() * this.rows)

      if(colIndex % 2 === 0) {
        cells.push(start)
        lastWayPoint = start
      } else {
        if(start === end) {
          cells.push(start)
        } else {
          for(var i = start; i !== end; (start > end) ? i-- : i++) {
            cells.push(i)
          }
          cells.push(i)
        }

        lastWayPoint = end
      }

      indexes.push(cells)
    }

    return indexes
  }

  var getCell = function(x, y) {
    var rows = this.container.querySelectorAll('tr')
      , row  = rows[y]

    return row.querySelectorAll('td')[x].cell
  }
})()
;
(function() {
  GridCell = function(grid, options) {
    var self = this

    this.grid        = grid
    this.type        = GridCell.INACCESSABLE
    this.dom         = document.createElement('td')
    this.dom.cell    = this
    this.dom.onclick = function() {
      self.fire('click')
    }

    this.setType(this.type)

    Utils.addObserverMethods(this)
  }

  GridCell.INACCESSABLE = 'inaccessable'
  GridCell.ACCESSABLE   = 'accessable'
  GridCell.PATH         = 'path'
  GridCell.MONSTER      = 'monster'
  GridCell.TOWER        = 'tower'

  GridCell.prototype.getElement = function() {
    return this.dom
  }

  GridCell.prototype.setType = function(type, additionalClasses) {
    this.type          = type
    this.dom.className = [this.type].concat(additionalClasses || []).join(' ')
  }

  GridCell.prototype.addClassName = function(name) {
    this.dom.className = this.dom.className.split(' ').concat([name]).join(' ')
  }

  GridCell.prototype.removeClassName = function(name) {
    this.dom.className = this.dom.className.split(' ').filter(function(_name) {
      return name !== _name
    }).join(' ')
  }

  GridCell.prototype.hasClassName = function(className) {
    return this.dom.className.split(' ').indexOf(className) !== -1
  }

  GridCell.prototype.getCoordinates = function() {
    var result = this.coordinates
      , self   = this

    if(!result) {
      this.grid.cells.forEach(function(cells, x) {
        cells.forEach(function(cell, y) {
          if(self === cell) {
            result = this.coordinates = { x: x, y: y }
          }
        })
      })
    }

    return result
  }
})()
;
(function() {
  Monster = function(path, options) {
    this.options = Utils.merge({
      speed: 100,
      health: 10,
      revenue: 100
    }, options || {})

    this.path       = path
    this.pathIndex  = 0
    this.cell       = null
    this.intervalId = null

    Utils.addObserverMethods(this)
  }

  Monster.prototype.initMoving = function() {
    var self = this

    this.intervalId = setInterval(function() {
      if(self.pathIndex < self.path.length) {
        self.move()
      } else {
        setPosition.call(self, null)
        self.fire('goal:reached')
        clearInterval(self.intervalId)
      }
    }, this.options.speed)
  }

  Monster.prototype.stop = function() {
    clearInterval(this.intervalId)
  }

  Monster.prototype.move = function() {
    setPosition.call(this, this.path[this.pathIndex])
    this.pathIndex++

    if(this.cell) {
      this.fire('move')
    }
  }

  Monster.prototype.getPosition = function() {
    return this.cell && this.cell.getCoordinates()
  }

  Monster.prototype.hurt = function(damage) {
    this.options.health -= damage

    if(this.options.health <= 0) {
      this.die()
    }
  }

  Monster.prototype.die = function() {
    this.stop()
    this.cell.setType(GridCell.PATH)
    this.fire('die')
  }

  // private

  var setPosition = function(cell) {
    if(this.cell) {
      this.cell.setType(GridCell.PATH)
    }

    if(cell) {
      cell.setType(GridCell.MONSTER)
    }

    this.cell = cell
  }
})()
;
(function() {
  "use strict"

  var Player = function(canvasSelector, metaDataContainer) {
    this.life   = 20
    this.cash   = 1000
    this.dom    = metaDataContainer
    this.canvas = document.querySelectorAll(canvasSelector)[0]

    window.Utils.addObserverMethods(this)
  }

  Player.prototype.isDead = function() {
    return this.life === 0
  }

  Player.prototype.render = function() {
    if(this.dom.parentNode === null) {
      this.canvas.appendChild(this.dom)
    }

    renderLife.call(this)
    renderCash.call(this)
  }

  Player.prototype.canBuy = function(towerType, level) {
    level = (typeof level === 'undefined') ? 0 : level
    return (this.cash >= window.Tower.TYPES[towerType].costs[level])
  }

  Player.prototype.buy = function(towerType, level) {
    level = (typeof level === 'undefined') ? 0 : level

    var costs = window.Tower.TYPES[towerType].costs[level]

    this.cash -= costs
    this.render()
  }

  Player.prototype.earn = function(money) {
    this.cash += money
    this.render()
  }

  Player.prototype.sell = function(tower) {
    this.earn(tower.getPrice() / 2)
  }

  Player.prototype.hurt = function() {
    this.life--
    this.render()

    if(this.life === 0) {
      this.fire('died')
    }
  }

  Player.prototype.heal = function() {
    this.life++
    this.render()
  }

  // private

  var renderLife = function() {
    var lifeContainer = document.getElementById('life')

    if(!lifeContainer) {
      lifeContainer = document.createElement('span')
      lifeContainer.id = 'life'
      this.dom.appendChild(lifeContainer)
    }

    lifeContainer.innerHTML = 'HP: ' + this.life.toString() + ' / 20'
  }

  var renderCash = function() {
    var cashContainer = document.getElementById('cash')

    if(!cashContainer) {
      cashContainer = document.createElement('span')
      cashContainer.id = 'cash'
      this.dom.appendChild(cashContainer)
    }

    cashContainer.innerHTML = 'Cash: ' + this.cash
  }

  window.Player = Player
})()
;
(function() {
  Tower = function(type, cell) {
    this.type     = type
    this.level    = 0
    this.cell     = cell
    this.lastShot = null
    this.range    = null

    Utils.addObserverMethods(this)
  }

  Tower.TYPES = {
    LASER: {
      name:         'Laser Tower',
      costs:        [100, 200, 1000],
      damages:      [2, 5, 10],
      ranges:       [3, 5, 7],
      frequencies:  [500, 450, 400]
    },

    ROCKET: {
      name:         'Rocket Tower',
      costs:        [300, 500, 1500],
      damages:      [10, 15, 25],
      ranges:       [7, 9, 12],
      frequencies:  [3000, 2700, 2200]
    },

    FREEZER: {
      name:         'Freezer',
      costs:        [200, 500, 750],
      damages:      [5, 7, 9],
      ranges:       [3, 4, 5],
      frequencies:  [5000, 4000, 3000]
    }
  }

  Tower.prototype.upgrade = function() {
    this.level++
    this.cell.setType(GridCell.TOWER, toClassNames.call(this))
  }

  Tower.prototype.render = function() {
    this.cell.setType(GridCell.TOWER, toClassNames.call(this))
    return this
  }

  Tower.prototype.getPrice = function() {
    return Tower.TYPES[this.type].costs[this.level]
  }

  Tower.prototype.getRange = function() {
    return Tower.TYPES[this.type].ranges[this.level]
  }

  Tower.prototype.getFrequency = function() {
    return Tower.TYPES[this.type].frequencies[this.level]
  }

  Tower.prototype.getDamage = function() {
    return Tower.TYPES[this.type].damages[this.level]
  }

  Tower.prototype.checkDistanceTo = function(monster) {
    if(monster.cell.dom) {
      var isInRange = this.pointIsInRange({
        x: monster.cell.dom.offsetLeft + (monster.cell.dom.offsetWidth / 2),
        y: monster.cell.dom.offsetTop + (monster.cell.dom.offsetHeight / 2)
      })

      if(isInRange && this.canShoot()) {
        this.shoot(monster)
        this.lastShot = +new Date()
      }
    }
  }

  Tower.prototype.pointIsInRange = function(point) {
    var radius     = this.getRange() * this.cell.dom.offsetHeight
      , centerX    = getCenter.call(this).x
      , centerY    = getCenter.call(this).y
      , distance   = Math.pow(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2), 0.5)

    return distance <= radius
  }

  Tower.prototype.canShoot = function() {
    return !this.lastShot || (((+new Date()) - this.lastShot) >= this.getFrequency())
  }

  Tower.prototype.shoot = function(monster) {
    var bullet  = document.createElement('div')
      , body    = document.body
      , xTarget = monster.cell.dom.offsetLeft
      , yTarget = monster.cell.dom.offsetTop
      , self    = this

    bullet.className      = 'bullet'
    bullet.style.left     = (this.cell.dom.offsetLeft + this.cell.dom.offsetWidth / 2) + 'px'
    bullet.style.top      = (this.cell.dom.offsetTop + this.cell.dom.offsetHeight / 2) + 'px'

    body.appendChild(bullet)

    setTimeout(function() {
      bullet.style.left = monster.cell.dom.offsetLeft +  monster.cell.dom.offsetWidth / 2 + 'px'
      bullet.style.top  = monster.cell.dom.offsetTop + monster.cell.dom.offsetHeight / 2 + 'px'
    }.bind(this), 10)

    setTimeout(function() {
      body.removeChild(bullet)
      monster.hurt(this.getDamage())
    }.bind(this), 250)
  }

  Tower.prototype.renderRange = function() {
    var circle = document.createElement('div')
      , dom    = this.cell.dom
      , size   = dom.offsetHeight
      , self   = this

    circle.className   = 'range'
    circle.style.width = circle.style.height = this.getRange() * 2 * dom.offsetHeight + 'px'

    // 2 === border width
    var x = getCenter.call(this).x - parseInt(circle.style.width, 10) / 2 - 2
      , y = getCenter.call(this).y - parseInt(circle.style.height, 10) / 2 - 2

    circle.style.left   = x + 'px'
    circle.style.top    = y + 'px'

    this.range = circle
    this.range.onclick = function() {
      self.removeRange()

      document.querySelectorAll('.menu').forEach(function(menu) {
        document.body.removeChild(menu)
      })
    }

    document.body.appendChild(circle)
  }

  Tower.prototype.removeRange = function() {
    var body = document.body

    if(this.range) {
      body.removeChild(this.range)
    }

    this.range = null
  }

  Tower.prototype.destroy = function() {
    toClassNames.call(this).forEach(function(klass) {
      this.cell.removeClassName(klass)
    }.bind(this))
  }

  // private

  var getCenter = function() {
    return {
      x: this.cell.dom.offsetLeft + (this.cell.dom.offsetWidth / 2),
      y: this.cell.dom.offsetTop  + (this.cell.dom.offsetHeight / 2)
    }
  }

  var toClassNames = function() {
    var towerName = this.type.toLowerCase().replace(/ /, '-')
      , levelName = 'level-' + this.level

    return [towerName, levelName]
  }
})()
;
(function() {
  TowerMenu = function(cell) {
    this.cell = cell

    Utils.addObserverMethods(this)
  }

  TowerMenu.prototype.render = function() {
    var self      = this
      , container = document.getElementById('tower-menu')

    this.cell.addClassName('selected')

    if(!container) {
      container = buildContainer.call(this)
      document.body.appendChild(container)
    }

    return this
  }

  TowerMenu.prototype.remove = function() {
    var menu = document.getElementById('tower-menu')
      , body = document.body

    this.cell.removeClassName('selected')

    body.removeChild(menu)
  }

  // private

  var buildContainer = function() {
    var container = document.createElement('ul')

    container.id = 'tower-menu'
    container.className = 'menu'

    for(var type in Tower.TYPES) {
      renderTower.call(this, type, container)
    }

    return container
  }

  var renderTower = function(type, container) {
    var self     = this
      , li       = document.createElement('li')
      , tower    = Tower.TYPES[type]
      , text     = Utils.interpolate("%{name} (%{costs})", { name: tower.name, costs: tower.costs[0] })
      , textNode = document.createTextNode(text)

    li.appendChild(textNode)
    li.setAttribute('data-tower-type', type)
    li.className = type.toLowerCase()

    li.onclick = function() {
      self.fire('select', this.getAttribute('data-tower-type'))
    }

    container.appendChild(li)
  }
})()
;
(function() {
  "use strict";

  var TowerMetaMenu = function(tower, player) {
    this.tower  = tower
    this.player = player
    this.dom    = document.createElement('ul')

    Utils.addObserverMethods(this)
  }

  TowerMetaMenu.prototype.render = function() {
    this.dom.className = 'menu'

    appendUpgrade.call(this)
    appendSell.call(this)

    document.body.appendChild(this.dom)
  }

  TowerMetaMenu.prototype.clear = function() {
    document.body.removeChild(this.dom)
  }

  // private

  var appendUpgrade = function() {
    var upgrade        = document.createElement('li')
      , level          = (this.tower.level + 1)
      , costs          = window.Tower.TYPES[this.tower.type].costs[level]
      , upgradeMessage = 'Upgrade to Level %{level} (%{costs})'

    if(level === 3) {
      upgradeMessage = 'Max level %{level} reached.'
      upgradeMessage = window.Utils.interpolate(upgradeMessage, { level: level, costs: costs })
    } else {
      upgrade.onclick = function() {
        if(this.player.canBuy(this.tower.type, level)) {
          this.player.buy(this.tower.type, level)

          this.tower.upgrade()
          this.tower.removeRange()
          this.tower.renderRange()

          this.clear()

          new TowerMetaMenu(this.tower, this.player).render()
        } else {
          alert('too expensive!')
        }
        upgradeMessage = window.Utils.interpolate(upgradeMessage, { level: level + 1, costs: costs })
      }.bind(this)
    }

    upgrade.appendChild(
      document.createTextNode(window.Utils.interpolate(upgradeMessage, { level: level + 1, costs: costs }))
    )
    upgrade.className = 'upgrade'

    this.dom.appendChild(upgrade)
  }

  var appendSell = function() {
    var sell        = document.createElement('li')
      , level       = this.tower.level
      , costs       = window.Tower.TYPES[this.tower.type].costs[level] / 2
      , sellMessage = window.Utils.interpolate('Sell (%{costs})', { costs: costs })

    sell.appendChild(document.createTextNode(sellMessage))

    sell.onclick = function() {
      this.player.sell(this.tower)
      this.tower.destroy()
      this.fire('tower:sold', this.tower)
    }.bind(this)
    sell.className = 'sell'

    this.dom.appendChild(sell)
  }

  window.TowerMetaMenu = TowerMetaMenu
})()
;
(function() {
  Game = function(canvasSelector, options) {
    this.options = Utils.merge({
      rows:         10,
      cols:         10,
      waveDuration: 20 * 1000
    }, options || {})

    this.canvas   = document.querySelector(canvasSelector)
    this.grid     = new Grid(this.options.rows, this.options.cols, this.canvas)
    this.meta     = document.createElement('div')
    this.player   = new Player(canvasSelector, this.meta)

    this.player.on('died', function() {
      alert('Hmm... there you go :(')
      this.pause()
    }.bind(this))

    this.monsters = []
    this.towers   = []
    this.wave     = -1

    this.nextWaveStartsAt = null
    this.towerMenu        = null
  }

  Game.prototype.render = function(options) {
    this.grid.render()
    this.player.render()

    this.meta.id = 'meta-data'
    document.body.appendChild(this.meta)

    waitUntilNextWaveStart.call(this, this.spawnNextWave.bind(this))

    updateWaveDuration.call(this)
    setInterval(updateWaveDuration.bind(this), 1000)

    observeGridCellClicks.call(this)

    return this
  }

  Game.prototype.pause = function() {
    this.monsters.forEach(function(wave) {
      wave.forEach(function(monster) {
        monster.stop()
      })
    })
  }

  Game.prototype.continue = function() {
    this.monsters.forEach(function(wave) {
      wave.forEach(function(monster) {
        monster.initMoving()
      })
    })
  }

  Game.prototype.getTowerByGridCell = function(cell) {
    var towers = this.towers.filter(function(tower) {
      return tower.cell === cell
    })

    return (towers.length === 1) ? towers[0] : null
  }

  Game.prototype.spawnNextWave = function() {
    this.wave++
    this.monsters[this.wave] = generateMonsters.call(this)
    moveMonsters.call(this)
  }

  // private

  var waitUntilNextWaveStart = function(callback) {
    this.nextWaveStartsAt = this.nextWaveStartsAt || (+new Date() + 5000)

    setTimeout(function() {
      if(!this.player.isDead()) {
        callback()
        this.nextWaveStartsAt = (+new Date() + this.options.waveDuration)
        waitUntilNextWaveStart.call(this, callback)
      }
    }.bind(this), Math.abs(+new Date() - this.nextWaveStartsAt))
  }

  var updateWaveDuration = function() {
    var container = document.getElementById('wave-duration')

    if(!container) {
      container = document.createElement('span')
      container.id = 'wave-duration'

      this.meta.appendChild(container)
    }

    var nextStart = Math.ceil(Math.abs(+new Date() - this.nextWaveStartsAt) / 1000)
      , message   = 'Wave #' + (this.wave + 2) + ' starts in ' + nextStart + 's'

    container.innerHTML = message
  }

  var generateMonsters = function() {
    var self     = this
      , speed    = Math.max(250, ~~(Math.random() * 1000))
      , monsters = []

    for(var i = 0; i < ((this.wave + 1) * 10); i++) {
      var monster = new Monster(this.grid.path, {
        speed: speed,
        health: (this.wave + 1) * 10
      })

      monster.on('goal:reached', this.player.hurt.bind(this.player))
      monster.on('move', function() {
        checkTowerDistances.call(self, this)
      })
      monster.on('die', function() {
        self.monsters = self.monsters.filter(function(_monster) {
          return _monster !== monster
        })
        self.player.earn(monster.options.revenue)
      })

      monsters.push(monster)
    }

    return monsters
  }

  var observeGridCellClicks = function() {
    var self = this

    this.grid.cells.forEach(function(cellGroup) {
      cellGroup.forEach(function(cell) {
        cell.on('click', function() {
          switch(this.type) {
            case GridCell.INACCESSABLE:
              initTowerMenu.call(self, this)
              removeTowerRanges.call(self)
              break
            case GridCell.TOWER:
              removeTowerRanges.call(self)

              if(self.menu) {
                self.menu.remove()
                self.menu = null
              }

              var tower = self.getTowerByGridCell(this)
                , menu  = new TowerMetaMenu(tower, self.player)

              tower.renderRange();
              menu.render()
              menu.on('tower:sold', function(tower) {
                removeTowerRanges.call(self)
                self.towers = self.towers.filter(function(_tower) {
                  return _tower !== tower
                })
                clearMenus.call(this)
              })

              break
          }
        })
      })
    })
  }

  var removeTowerRanges = function() {
    this.towers.forEach(function(tower) {
      tower.removeRange()
    })
  }

  var clearMenus = function() {
    if(this.menu) {
      this.menu.remove()
    }

    document.querySelectorAll('.menu').forEach(function(menu) {
      document.body.removeChild(menu)
    })
  }

  var initTowerMenu = function(cell) {
    var self = this

    clearMenus.call(this)

    if(cell.hasClassName('tower')) {
      return
    }

    this.menu = new TowerMenu(cell).render()
    this.menu.on('select', function(towerType) {
      if(self.player.canBuy(towerType)) {
        var tower = new Tower(towerType, cell).render()

        self.player.buy(towerType)
        self.towers.push(tower)

        cell.fire('click')
      } else {
        alert('too expensive!')
      }
    })
  }

  var checkTowerDistances = function(monster) {
    this.towers.forEach(function(tower) {
      tower.checkDistanceTo(monster)
    })
  }

  var moveMonsters = function() {
    this.monsters[this.wave].forEach(function(monster, i) {
      setTimeout(function() {
        monster.initMoving()
      }, i * 2 * monster.options.speed)
    })
  }
})()
;
window.addEventListener('load', function() {
  var w=window,d=document,e=d.documentElement,g=d.getElementsByTagName('body')[0],x=w.innerWidth||e.clientWidth||g.clientWidth,y=w.innerHeight||e.clientHeight||g.clientHeight

  var cellWidth  = 24
    , cellHeight = 28

  game = new Game('body', {
    cols: ~~(x / cellWidth),
    rows: ~~((y - 30) / cellHeight)
  }).render()
}, false);
;
