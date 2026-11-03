// These public descriptors supplement the relational category. Unique ownership
// marks belong in the separate private identifying-detail field.
export const CATEGORY_DESCRIPTORS = {
 'Electronics': {key:'model', label:'Device model (public)'},
 'Bottles & lunchboxes': {key:'capacity', label:'Capacity (public)'},
 'Books & stationery': {key:'author', label:'Author / edition (public)'},
 'Bags': {key:'bag_type', label:'Bag type (public)'},
 'Keys & accessories': {key:'accessory_type', label:'Accessory type (public)'},
 'Clothing': {key:'size', label:'Size (public)'},
 'Sports equipment': {key:'equipment_type', label:'Equipment type (public)'}
};
export function descriptorFor(categoryName) {
 return CATEGORY_DESCRIPTORS[categoryName] || {key:'item_type',label:'Item type (public)'};
}
export function editableAttributes(details) {
 const attributes={...details};
 delete attributes.secret;
 delete attributes.photo;
 return {brand:'',material:'',...attributes};
}
export function formatDate(value) {
 const text=String(value);
 const date=/^\d{4}-\d{2}-\d{2}$/.test(text)
  ? new Date(...text.split('-').map((part,index)=>Number(part)-(index===1?1:0)))
  : new Date(value);
 return date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
