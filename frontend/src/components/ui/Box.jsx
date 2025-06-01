import React from 'react'

const Box = ({ children, cls }) => {
  return (
    <div className={`bg-gray-800 shadow-md rounded-lg p-3 w-full max-w-3xl mx-auto ${cls ? cls : ""}`}>
        {children}
    </div>
  )
}

export default Box;