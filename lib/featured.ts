export const featuredGames = [
 {name:"Rummikub", kind:"tiles", category:"Classic", description:"A little strategy. A lot of good company."},
 {name:"Scrabble", kind:"words", category:"Word", description:"Good words and even better conversation."},
 {name:"Yahtzee", kind:"dice", category:"Classic", description:"Roll the dice. Cheer each other on."},
 {name:"Skip-Bo", kind:"cards", category:"Card", description:"A familiar favorite to deal everyone in."},
 {name:"Sorry!", kind:"pawns", category:"Family", description:"Friendly competition. No hard feelings."},
 {name:"The Game of Life", kind:"life", category:"Family", description:"Take a few unexpected turns together."},
 {name:"Clue", kind:"mystery", category:"Classic", description:"A little mystery around the table."},
] as const;
export const starterGames = featuredGames.map((g,i)=>({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,"0")}`,name:g.name,description:g.description,category:g.category,players:null,curated:true,suggested_by:null,hidden:false,created_at:"",votes:0,voted:false}));
