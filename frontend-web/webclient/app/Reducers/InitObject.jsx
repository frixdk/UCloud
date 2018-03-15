const GET_INIT_OBJECT = "GET_INIT_OBJECT";

const initObject = (state, action) => {
    switch (action.type) {
        case GET_INIT_OBJECT: {
            return Object.assign({}, state, { /* TODO unpacking */ })
        }
        default: {
            return state
        }
    }
}