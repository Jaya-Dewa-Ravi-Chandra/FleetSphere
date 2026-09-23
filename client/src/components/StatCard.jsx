import React from 'react';export default function StatCard({label,value,sub}){return <div className="stat"><span>{label}</span><strong>{value}</strong><small>{sub||'Live from MongoDB'}</small></div>}
