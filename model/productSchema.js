const mongoose=require('mongoose')
const productSchema= new mongoose.Schema({
     name: {
        type:String,
        required:true
     },
     
        brand:{
            type:String,
            required:true
        }
     ,
     description:{
        type:String,
        required:true
     },
     category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required:true
     },
     size:{
        type:String,
        default:'M'
     },
     price:{
        type:Number,
        default:0
     },
     stock:[{
        type:Number,
        required:true,
        min:0,
        max:200
     }],
     image:{
        type:Array,
        required:true
     },
     softDelete:{
        type:Boolean,
        default:false
     }
});
module.exports=mongoose.model('Product',productSchema)