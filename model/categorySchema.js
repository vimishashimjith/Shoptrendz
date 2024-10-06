const mongoose=require('mongoose')
const categorySchema= new 
mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    softDelete:{
        type:Boolean,
        default:false
    },
    offer: {
        type: Number,
        default: 0,
        min: [0, 'Offer must be a non-negative number'],
        max: [100, 'Offer cannot exceed 100%']
      },
      offerStart: {
        type: Date
      },
      offerEnd: {
        type: Date
      }
})
module.exports=mongoose.model('Category',categorySchema);