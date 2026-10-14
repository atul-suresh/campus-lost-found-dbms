export class AppError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export function textValue(v,label,min=1,max=100){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)throw new AppError(`${label} must contain ${min}-${max} characters`);return v.trim();}
export function uuid(v,label='ID'){if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))throw new AppError(`Invalid ${label}`);return v;}
export function itemInput(b){
 if(!['lost','found'].includes(b.kind))throw new AppError('Choose lost or found');
 const title=textValue(b.title,'Title',3,100), description=textValue(b.description,'Description',10,1500);
 if(!Number.isInteger(Number(b.category_id))||Number(b.category_id)<1||!Number.isInteger(Number(b.location_id))||Number(b.location_id)<1)throw new AppError('Choose a category and location');
 if(typeof b.event_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.event_date)||Number.isNaN(Date.parse(b.event_date))||new Date(b.event_date).toISOString().slice(0,10)!==b.event_date||b.event_date>new Date().toISOString().slice(0,10))throw new AppError('Enter a valid date that is not in the future');
 const color=typeof b.color==='string'?b.color.trim():'';if(color.length>40)throw new AppError('Color is too long');
 const attributes=b.attributes||{};
 if(typeof attributes!=='object'||Array.isArray(attributes)||Object.keys(attributes).length>10)throw new AppError('Maximum 10 public attributes');
 for(const [k,v] of Object.entries(attributes)){if(!/^[a-zA-Z0-9 _-]{1,30}$/.test(k)||typeof v!=='string'||v.length>120)throw new AppError('Invalid public attribute');}
 const secret=typeof b.secret==='string'?b.secret.trim():'';if(secret.length>1000)throw new AppError('Private identifying detail is too long');
 const photo=b.photo||null;if(photo&&(typeof photo!=='string'||photo.length>850000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo)))throw new AppError('Use a PNG, JPEG or WebP photo below 600 KB');
 if(photo&&Buffer.byteLength(photo.split(',')[1],'base64')>600000)throw new AppError('Photo exceeds 600 KB');
 return {kind:b.kind,title,description,category_id:Number(b.category_id),location_id:Number(b.location_id),event_date:b.event_date,color,attributes,secret,photo};
}
