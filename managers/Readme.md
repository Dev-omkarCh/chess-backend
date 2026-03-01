# Chess Backend

Chess is a very sopisticated game with a lot of rules and edge cases. This backend not implements all of those fancy rules they are managed by the chess.js library. The main objective of this backend is to manage the game state, handle player interactions, validate moves(using chess.js), and facilitate communication between players in a multiplayer chess game. It provides the necessary infrastructure to create, join, and manage chess games, ensuring a smooth and enjoyable gaming experience for players.

Mostly the backend is responsible for managing game sessions, player interactions, and game state. It handles the creation of game rooms, player matchmaking, move validation using chess.js, and communication between players. The backend ensures that the game state is consistent and that players can interact with each other in real-time, providing a seamless multiplayer chess experience.

And all the game data for each game is stored in db, and can be used to provide AI the context of the game, so each games can have AI Chat Window where Players can ask for advice, what players can improve, what where the mistakes, and what are the best moves in the current position. And all of this is possible because of the game data stored in db, and the chess.js library that provides a comprehensive set of functions to manage the game state and validate moves.

## Chess.js Library

We are using the chess.js library to handle the game logic and rules of chess. This library provides a comprehensive set of functions to manage the game state, validate moves, and determine game outcomes. By leveraging chess.js, we can ensure that all moves made by players are legal according to the rules of chess, and we can easily track the state of the game, including piece positions, move history, and special rules like castling and en passant.

We can't implement all the rules of chess from scratch, and chess.js provides a reliable and efficient way to handle the complexities of the game. It allows us to focus on building the multiplayer functionality and user experience, while relying on chess.js to manage the core game logic.

## Using Class Based Programming

The backend is structured using class-based programming, which allows for better organization and modularity of the code. Each class represents a specific aspect of the game, such as Game, Player, and GameManager. This approach promotes encapsulation and separation of concerns, making the code easier to maintain and extend in the future.

### Why OOPS?

- **Encapsulation**: A Knight class knows how a knight moves. You don't want a giant if/else block in your main file checking every piece type.

- **Polymorphism**: You can have a base Piece class, and King, Pawn, and Rook can inherit from it. They all have a getValidMoves() method, but each calculates it differently.

- **State Management**: It's much easier to manage complex rules like Castling (which requires knowing if the King has moved) or En Passant (which requires knowing the previous move) inside a Game class.


## Chess Flow from Fronend to Backend

### The Flow:

**1. User Drags a Piece (Frontend)**: The frontend chess.js instance checks: "Is this move legal?"

- If **Yes**: The piece moves instantly (UX feels smooth).

- If **No**: The piece snaps back immediately without even hitting the network.

**2. The Emit (Socket.io)**:

- The frontend sends a message to the backend: { from: 'e2', to: 'e4' }.

**3. The Validation (Backend)**:

- The backend chess.js instance for that specific "Room" receives the move.

- **It checks**: "Is this actually legal?" (This prevents hackers from bypasssing the frontend check).

**4. The Resolution**:

- **Valid**: The backend updates its state and emits move_made to the opponent.

- **Invalid**: The backend emits illegal_move back to the player, and the frontend "snaps" the piece back to its original spot.


## Chess Integration with AI

AI models (like GPT-4 or Gemini) don't "see" a chessboard image easily. They prefer FEN (Forsyth-Edwards Notation) or PGN (Portable Game Notation).

`chess.js` can export the entire game history as a PGN string with one command: game.pgn().

**The AI Window**: After the game, we send that PGN string to your AI. The AI reads it, analyzes the moves (perhaps comparing them to an engine like Stockfish), and says: 

`"On move 14, you missed a fork because you moved your Bishop to b5."`

