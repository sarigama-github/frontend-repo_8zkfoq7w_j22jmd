import { useEffect, useMemo, useState } from 'react'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  // Shared state
  const [pastries, setPastries] = useState([])
  const [loadingPastries, setLoadingPastries] = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [onlyPending, setOnlyPending] = useState(true)

  // Business signup
  const [bizForm, setBizForm] = useState({
    name: '',
    email: '',
    phone: '',
    business_type: '',
    address: '',
  })
  const [signupResult, setSignupResult] = useState(null)
  const [signupLoading, setSignupLoading] = useState(false)

  // Admin pastry create
  const [pastryForm, setPastryForm] = useState({ name: '', description: '', price: '', active: true })
  const [creatingPastry, setCreatingPastry] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')

  // Order form
  const [orderBizId, setOrderBizId] = useState('')
  const [cart, setCart] = useState({}) // pastryId -> quantity
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')

  const subtotal = useMemo(() => {
    return pastries.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0)
  }, [cart, pastries])
  const deliveryFee = 0
  const total = subtotal + deliveryFee

  const fetchPastries = async () => {
    try {
      setLoadingPastries(true)
      const res = await fetch(`${baseUrl}/api/pastries`)
      const data = await res.json()
      setPastries(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPastries(false)
    }
  }

  const fetchBusinesses = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/business?only_pending=${onlyPending}`)
      const data = await res.json()
      setBusinesses(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchPastries()
  }, [])

  useEffect(() => {
    fetchBusinesses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyPending])

  const onSignup = async (e) => {
    e.preventDefault()
    setSignupLoading(true)
    setSignupResult(null)
    try {
      const res = await fetch(`${baseUrl}/api/business/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bizForm),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setSignupResult(data)
      setBizForm({ name: '', email: '', phone: '', business_type: '', address: '' })
      fetchBusinesses()
    } catch (e) {
      setSignupResult({ error: typeof e.message === 'string' ? e.message : 'Signup failed' })
    } finally {
      setSignupLoading(false)
    }
  }

  const onApprove = async (id, approved) => {
    try {
      const res = await fetch(`${baseUrl}/api/business/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      if (!res.ok) throw new Error(await res.text())
      await fetchBusinesses()
      setAdminMessage('Updated approval status')
      setTimeout(() => setAdminMessage(''), 1500)
    } catch (e) {
      setAdminMessage('Failed to update approval')
    }
  }

  const onCreatePastry = async (e) => {
    e.preventDefault()
    setCreatingPastry(true)
    setAdminMessage('')
    try {
      const res = await fetch(`${baseUrl}/api/pastries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pastryForm.name,
          description: pastryForm.description || undefined,
          price: Number(pastryForm.price || 0),
          active: pastryForm.active,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setPastryForm({ name: '', description: '', price: '', active: true })
      await fetchPastries()
      setAdminMessage('Pastry added')
      setTimeout(() => setAdminMessage(''), 1500)
    } catch (e) {
      setAdminMessage('Failed to add pastry')
    } finally {
      setCreatingPastry(false)
    }
  }

  const setQty = (id, qty) => {
    setCart((c) => ({ ...c, [id]: Math.max(0, qty) }))
  }

  const onPlaceOrder = async (e) => {
    e.preventDefault()
    setOrderMessage('')
    setPlacingOrder(true)
    try {
      const selected = pastries.filter((p) => (cart[p.id] || 0) > 0)
      if (!orderBizId) throw new Error('Business ID is required')
      if (selected.length === 0) throw new Error('Please add at least one pastry')
      if (!deliveryDate || !deliveryTime || !deliveryAddress) throw new Error('Delivery details are required')

      const items = selected.map((p) => ({
        pastry_id: p.id,
        name: p.name,
        quantity: cart[p.id],
        unit_price: p.price,
      }))

      const payload = {
        business_id: orderBizId,
        items,
        delivery_date: deliveryDate,
        delivery_time: deliveryTime,
        delivery_address: deliveryAddress,
        notes: notes || undefined,
        subtotal: Number(subtotal.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        total: Number(total.toFixed(2)),
      }

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setOrderMessage(`Order placed. ID: ${data.id}`)
      setCart({})
      setDeliveryAddress('')
      setDeliveryDate('')
      setDeliveryTime('')
      setNotes('')
    } catch (e) {
      setOrderMessage(typeof e.message === 'string' ? e.message : 'Failed to place order')
    } finally {
      setPlacingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">IZZYY'S BUSINESS</h1>
            <p className="text-gray-600">Sign up, get approved, and place pastry orders.</p>
          </div>
          <a href="/test" className="text-sm text-blue-600 underline">System check</a>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Business Sign Up">
            <form onSubmit={onSignup} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="input" placeholder="Business name" value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} />
                <input className="input" placeholder="Email" type="email" value={bizForm.email} onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })} />
                <input className="input" placeholder="Phone" value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
                <input className="input" placeholder="Type (restaurant, school, etc.)" value={bizForm.business_type} onChange={(e) => setBizForm({ ...bizForm, business_type: e.target.value })} />
                <input className="input md:col-span-2" placeholder="Address" value={bizForm.address} onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })} />
              </div>
              <button disabled={signupLoading} className="btn-primary w-full">{signupLoading ? 'Submitting...' : 'Submit'}</button>
            </form>
            {signupResult && (
              <div className={`mt-3 text-sm p-3 rounded ${signupResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {signupResult.error ? 'Error: ' : 'Success: '}
                {signupResult.error || `Saved. Your business ID is ${signupResult.id}. Pending approval.`}
              </div>
            )}
          </Section>

          <Section title="Admin: Approvals & Pastries">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
                  Show only pending approvals
                </label>
                <button onClick={fetchBusinesses} className="btn-secondary">Refresh</button>
              </div>
              <div className="max-h-48 overflow-auto border rounded p-2 bg-gray-50">
                {businesses.length === 0 ? (
                  <p className="text-sm text-gray-500">No businesses found.</p>
                ) : (
                  <ul className="space-y-2">
                    {businesses.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-3 bg-white rounded p-2 border">
                        <div>
                          <p className="font-medium text-gray-800">{b.name}</p>
                          <p className="text-xs text-gray-500">{b.email} • {b.business_type} • {b.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${b.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{b.approved ? 'Approved' : 'Pending'}</span>
                          {!b.approved && (
                            <button onClick={() => onApprove(b.id, true)} className="btn-primary">Approve</button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={onCreatePastry} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input className="input" placeholder="Pastry name" value={pastryForm.name} onChange={(e) => setPastryForm({ ...pastryForm, name: e.target.value })} />
                <input className="input" placeholder="Description" value={pastryForm.description} onChange={(e) => setPastryForm({ ...pastryForm, description: e.target.value })} />
                <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={pastryForm.price} onChange={(e) => setPastryForm({ ...pastryForm, price: e.target.value })} />
                <button disabled={creatingPastry} className="btn-secondary">{creatingPastry ? 'Adding...' : 'Add Pastry'}</button>
              </form>
              {adminMessage && <p className="text-sm text-gray-600">{adminMessage}</p>}
            </div>
          </Section>
        </div>

        <Section title="Place an Order">
          <form onSubmit={onPlaceOrder} className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <input className="input" placeholder="Approved Business ID" value={orderBizId} onChange={(e) => setOrderBizId(e.target.value)} />
              <input className="input" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              <input className="input" type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
              <input className="input" placeholder="Delivery address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Choose pastries</h3>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {loadingPastries ? (
                  <p className="text-gray-500">Loading pastries...</p>
                ) : pastries.length === 0 ? (
                  <p className="text-gray-500">No pastries yet. Add some in the admin panel.</p>
                ) : (
                  pastries.map((p) => (
                    <div key={p.id} className="border rounded p-3 bg-white flex flex-col gap-2">
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.description || '—'}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">${p.price.toFixed(2)}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => setQty(p.id, (cart[p.id] || 0) - 1)}>-</button>
                          <input className="w-12 text-center border rounded" type="number" min="0" value={cart[p.id] || 0} onChange={(e) => setQty(p.id, parseInt(e.target.value || '0', 10))} />
                          <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => setQty(p.id, (cart[p.id] || 0) + 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded p-3">
              <div className="text-sm text-gray-600">Subtotal: ${subtotal.toFixed(2)} • Delivery: ${deliveryFee.toFixed(2)}</div>
              <div className="text-lg font-bold text-gray-800">Total: ${total.toFixed(2)}</div>
            </div>

            <button disabled={placingOrder} className="btn-primary">{placingOrder ? 'Placing...' : 'Place Order'}</button>

            {orderMessage && (
              <div className="text-sm p-3 rounded bg-blue-50 text-blue-700">{orderMessage}</div>
            )}
          </form>
        </Section>

        <footer className="text-center text-xs text-gray-500">
          Need to verify system? Visit the System check link above.
        </footer>
      </div>

      {/* Tailwind helpers */}
      <style>{`
        .input { @apply w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200; }
        .btn-primary { @apply inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition; }
        .btn-secondary { @apply inline-flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white font-semibold px-4 py-2 rounded transition; }
      `}</style>
    </div>
  )
}

export default App
