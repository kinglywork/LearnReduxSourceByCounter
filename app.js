const counter = (state = 0, action) => {
  switch (action.type) {
    case "INCREMENT":
      return state + 1;
    case "DECREMENT":
      return state - 1;
    default:
      return state;
  }
};

const timer = (state = '', action) => {
  switch(action.type) {
    case "TIMER":
      const now = new Date();
      return now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
    default:
      return state;      
  }
}

const Counter = ({
  value,
  onIncrement,
  onDecrement
})=>(
    <div>
      <h1>{value}</h1>
      <button onClick={onIncrement}>+</button>
      <button onClick={onDecrement}>-</button>
    </div>
);

const Panel = ({
  time,
  startTimer,
  children
}) => (
  <div>
    <h2>{time}</h2>
    <button onClick={startTimer}>start timer</button>
    {children}
  </div>
);

const logMiddleware = store => next => action => {
  const stateString = ({counter, timer}) => 'counter is ' + counter + ', timer is ' + timer;
  console.log('before dispatch: action is ' + action.type + ', ' + stateString(store.getState()));
  next(action);
  console.log('after dispatch: current action is ' + action.type + ', ' + stateString(store.getState()));
}

const limitMiddleware = store => next => action => {
  const {counter} = store.getState();
  const LIMIT = 3;
  if(counter >= LIMIT && action.type === "INCREMENT"){
    console.log('can not increment any more!');
    return;
  }
  if(counter <= -LIMIT && action.type === "DECREMENT"){
    console.log('can not decrement any more!');
    return
  }
  next(action);
}

const thunkMiddleware = store => next => action => {
  if(typeof action === 'function'){
    action(store.dispatch, store.getState);
  } else {
    next(action);
  }
}

const createFinalStore = applyMiddleware(
  thunkMiddleware,
  limitMiddleware,
  logMiddleware  
);

var app = combineReducers({counter, timer});
var store = createFinalStore(createStore)(app);

const render = () => {
  ReactDOM.render(
    <Panel
      time={store.getState().timer}
      startTimer={() => {
        store.dispatch((dispatch, getState) => setInterval(() => dispatch({type: 'TIMER'}), 1000))
      }}      
    >
      <Counter 
        value={store.getState().counter} 
        onIncrement={()=>
          store.dispatch({type:'INCREMENT'})
        }
        onDecrement={()=>
          store.dispatch({type:'DECREMENT'})
        }
      />
    </Panel>,
    document.getElementById('root')
  );
};

store.subscribe(render);
render();

//--redux source---------------------------------------------------
function createStore(reducer, initialState, enhancer) {
  if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
    enhancer = initialState;
    initialState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    return enhancer(createStore)(reducer, initialState);
  }

  var currentReducer = reducer;
  var currentState = initialState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  function getState() {
    return currentState;
  }

  function subscribe(listener) {
    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    }
  }

  function dispatch(action) {
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }

    return action;
  }

  dispatch({ type: '@@redux/INIT' });

  return {
    dispatch,
    subscribe,
    getState
  };
}

function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }
  var finalReducerKeys = Object.keys(finalReducers);

  return function combination(state = {}, action) {
    var hasChanged = false;
    var nextState = {};
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i];
      var reducer = finalReducers[key];
      var previousStateForKey = state[key];
      var nextStateForKey = reducer(previousStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  }
}

function compose(...funcs) {
  return (...args) => {
    if (funcs.length === 0) {
      return args[0]
    }

    const last = funcs[funcs.length - 1]
    const rest = funcs.slice(0, -1)

    return rest.reduceRight((composed, f) => f(composed), last(...args))
  }
}

function applyMiddleware(...middlewares) {
  return (createStore) => (reducer, initialState, enhancer) => {
    var store = createStore(reducer, initialState, enhancer);
    var dispatch = store.dispatch;
    var chain = [];

    var middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    };
    chain = middlewares.map(middleware => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);

    return {
      ...store,
      dispatch
    };
  }
}

