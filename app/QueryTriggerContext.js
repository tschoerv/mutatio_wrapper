import React, { createContext, useState, useContext } from 'react';

const QueryTriggerContext = createContext();

export const useQueryTrigger = () => useContext(QueryTriggerContext);

export const QueryTriggerProvider = ({ children }) => {
  const [queryTrigger, setQueryTrigger] = useState(0);

  // The toggle function could also be provided if needed
  const toggleQueryTrigger = () =>  setQueryTrigger(prev => prev + 1);;

  return (
    <QueryTriggerContext.Provider value={{ queryTrigger, toggleQueryTrigger }}>
      {children}
    </QueryTriggerContext.Provider>
  );
};
